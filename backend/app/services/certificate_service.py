import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session
from PIL import Image, ImageDraw, ImageFont
import io
import qrcode
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.db.deps import get_db
from app.models.certificate import Certificate
from app.models.user import User


class CertificateService:
    def __init__(self):
        # TODO: Initialize Cloudflare R2 client when boto3 is installed
        # For now, we'll use placeholder URLs
        self.bucket_name = settings.cloudflare_r2_bucket_name

    def generate_funding_certificate(
        self,
        user_id: int,
        challenge_account_id: str,
        account_size: str,
        db: Session
    ) -> Optional[Certificate]:
        """Generate a funding certificate for a user who passed phase 2"""
        try:
            # Get user details
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                print(f"Certificate generation failed: User {user_id} not found")
                return None

            # Determine which name to use based on user setting
            display_name = user.nick_name if user.use_nickname_for_certificates and user.nick_name else user.full_name
            if not display_name:
                # Fallback to email username if no display name
                display_name = user.email.split('@')[0] if user.email else f"User {user_id}"
                print(f"Using fallback display name for user {user_id}: {display_name} (original full_name: {user.full_name}, nick_name: {user.nick_name})")

            print(f"Generating certificate for user {user_id} ({user.email}) with display name: {display_name}")

            # Generate certificate data
            certificate_data = {
                "certificate_id": str(uuid.uuid4()),
                "user_name": display_name,
                "certificate_type": "funding",
                "title": f"NairaTrader Funding Achievement - ${account_size}",
                "description": f"Congratulations! You have successfully completed the NairaTrader challenge and earned funding of ${account_size}.",
                "account_size": account_size,
                "challenge_account_id": challenge_account_id,
                "generated_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "account_size": account_size,
                    "challenge_account_id": challenge_account_id
                }
            }

            # Generate PDF (placeholder - will be implemented with template)
            pdf_content = self._generate_certificate_pdf(certificate_data)

            # Upload to Cloudflare R2
            file_key = f"certificates/funding/{user_id}/{certificate_data['certificate_id']}.png"
            certificate_url = self._upload_to_r2(pdf_content, file_key)

            # Save to database
            certificate = Certificate(
                user_id=user_id,
                certificate_type="funding",
                title=certificate_data["title"],
                description=certificate_data["description"],
                certificate_url=certificate_url,
                file_key=file_key,
                related_entity_id=challenge_account_id,
                metadata=json.dumps(certificate_data["metadata"])
            )

            db.add(certificate)
            db.commit()
            db.refresh(certificate)

            return certificate

        except Exception as e:
            print(f"Error generating funding certificate: {e}")
            return None

    def generate_payout_certificate(
        self,
        user_id: int,
        payout_id: str,
        amount: str,
        db: Session
    ) -> Optional[Certificate]:
        """Generate a payout certificate for a user who received a payout"""
        try:
            # Get user details
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return None

            # Determine which name to use based on user setting
            display_name = user.nick_name if user.use_nickname_for_certificates and user.nick_name else user.full_name
            if not display_name:
                return None

            # Generate certificate data
            certificate_data = {
                "certificate_id": str(uuid.uuid4()),
                "user_name": display_name,
                "certificate_type": "payout",
                "title": f"NairaTrader Payout Certificate - ₦{amount}",
                "description": f"Congratulations! You have successfully received a payout of ₦{amount} from NairaTrader.",
                "amount": amount,
                "payout_id": payout_id,
                "generated_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "amount": amount,
                    "payout_id": payout_id
                }
            }

            # Generate PDF (placeholder - will be implemented with template)
            pdf_content = self._generate_certificate_pdf(certificate_data)

            # Upload to Cloudflare R2
            file_key = f"certificates/payout/{user_id}/{certificate_data['certificate_id']}.png"
            certificate_url = self._upload_to_r2(pdf_content, file_key)

            # Save to database
            certificate = Certificate(
                user_id=user_id,
                certificate_type="payout",
                title=certificate_data["title"],
                description=certificate_data["description"],
                certificate_url=certificate_url,
                file_key=file_key,
                related_entity_id=payout_id,
                metadata=json.dumps(certificate_data["metadata"])
            )

            db.add(certificate)
            db.commit()
            db.refresh(certificate)

            return certificate

        except Exception as e:
            print(f"Error generating payout certificate: {e}")
            return None

    def get_user_certificates(self, user_id: int, db: Session) -> list[Certificate]:
        """Get all certificates for a user"""
        return db.query(Certificate).filter(Certificate.user_id == user_id).order_by(Certificate.generated_at.desc()).all()

    def get_certificate_by_id(self, certificate_id: int, user_id: int, db: Session) -> Optional[Certificate]:
        """Get a specific certificate by ID for a user"""
        return db.query(Certificate).filter(
            Certificate.id == certificate_id,
            Certificate.user_id == user_id
        ).first()

    def generate_test_certificate(self, user_name: str = "John Doe", certificate_type: str = "funding") -> str:
        """Generate a test certificate and save it to the test folder"""
        try:
            # Create test certificate data
            certificate_data = {
                "certificate_id": str(uuid.uuid4()),
                "user_name": user_name,
                "certificate_type": certificate_type,
                "title": f"NairaTrader {'Funding Achievement' if certificate_type == 'funding' else 'Payout Certificate'}",
                "description": f"Test certificate for {user_name}",
                "account_size": "10000" if certificate_type == "funding" else "200K",
                "amount": "50000" if certificate_type == "payout" else None,
                "generated_at": datetime.utcnow().isoformat(),
                "metadata": {}
            }

            # Generate certificate image
            image_bytes = self._generate_certificate_pdf(certificate_data)

            # Save to test folder
            test_dir = Path(__file__).parent.parent / "templates" / "certificate-templates" / "test"
            test_dir.mkdir(exist_ok=True)

            test_filename = f"test_{certificate_type}_{user_name.replace(' ', '_')}.png"
            test_path = test_dir / test_filename

            with open(test_path, 'wb') as f:
                f.write(image_bytes)

            return str(test_path)

        except Exception as e:
            print(f"Error generating test certificate: {e}")
            return f"Error: {e}"

    def _generate_certificate_pdf(self, certificate_data: Dict[str, Any]) -> bytes:
        """Generate PDF certificate content using template image"""
        try:
            # Determine template path based on certificate type
            template_name = "FUNDED.png" if certificate_data['certificate_type'] == 'funding' else "PAYOUT.png"
            template_path = Path(__file__).parent.parent / "templates" / "certificate-templates" / template_name

            if not template_path.exists():
                # Fallback to placeholder if template doesn't exist
                pdf_content = f"""
                NairaTrader Certificate

                Certificate ID: {certificate_data['certificate_id']}
                User: {certificate_data['user_name']}
                Type: {certificate_data['certificate_type']}
                Title: {certificate_data['title']}
                Description: {certificate_data['description']}
                Generated: {certificate_data['generated_at']}

                NairaTrader Team
                """.encode('utf-8')
                return pdf_content

            # Open template image
            image = Image.open(template_path)
            draw = ImageDraw.Draw(image)

            # Load custom fonts for funded certificates
            fonts_path = Path(__file__).parent.parent / "templates" / "fonts"

            if certificate_data['certificate_type'] == 'funding':
                try:
                    # Use custom fonts for funded certificates
                    font_name = ImageFont.truetype(str(fonts_path / "OpenSans-Bold.ttf"), 132)
                    font_date = ImageFont.truetype(str(fonts_path / "OpenSans-Regular.ttf"), 48)  # Increased size
                except:
                    # Fallback to system fonts
                    try:
                        font_name = ImageFont.truetype("/System/Library/Fonts/Arial Bold.ttf", 132)
                        font_date = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
                    except:
                        font_name = ImageFont.load_default()
                        font_date = ImageFont.load_default()
            elif certificate_data['certificate_type'] == 'payout':
                try:
                    # Use custom fonts for payout certificates
                    font_name = ImageFont.truetype(str(fonts_path / "OpenSans-Bold.ttf"), 132)
                    # Try to use bold font for amount, fallback to regular if not available
                    try:
                        font_amount = ImageFont.truetype(str(fonts_path / "OpenSans-Bold.ttf"), 72)  # Larger and bold for amount
                    except:
                        font_amount = ImageFont.truetype(str(fonts_path / "OpenSans-Regular.ttf"), 72)  # Larger for amount
                    font_date = ImageFont.truetype(str(fonts_path / "OpenSans-Regular.ttf"), 42)   # Larger for other text
                except:
                    # Fallback to system fonts
                    try:
                        font_name = ImageFont.truetype("/System/Library/Fonts/Arial Bold.ttf", 132)
                        font_amount = ImageFont.truetype("/System/Library/Fonts/Arial Bold.ttf", 72)
                        font_date = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 42)
                    except:
                        try:
                            font_name = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 120)
                            font_amount = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 72)
                            font_date = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 42)
                        except:
                            font_name = ImageFont.load_default()
                            font_amount = ImageFont.load_default()
                            font_date = ImageFont.load_default()
            else:
                # Use system fonts for other certificate types
                try:
                    font_name = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 60)
                    font_date = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 17)
                except:
                    try:
                        font_name = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
                        font_date = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 17)
                    except:
                        font_name = ImageFont.load_default()
                        font_date = ImageFont.load_default()

            # Format date
            generated_date = datetime.fromisoformat(certificate_data['generated_at'].replace('Z', '+00:00'))
            formatted_date = generated_date.strftime("%-dTH %B %Y").upper()

            if certificate_data['certificate_type'] == 'funding':
                # Add name text (white, centered) - Funding coordinates
                name_bbox = draw.textbbox((0, 0), certificate_data['user_name'], font=font_name)
                name_width = name_bbox[2] - name_bbox[0]
                name_x = (158 + 1170) // 2 - name_width // 2  # Center in name area
                name_y = (580 + 760) // 2 - (name_bbox[3] - name_bbox[1]) // 2  # Center vertically

                draw.text((name_x, name_y), certificate_data['user_name'], fill="white", font=font_name)

                # Add date text (white, centered) - Funding coordinates
                date_bbox = draw.textbbox((0, 0), formatted_date, font=font_date)
                date_width = date_bbox[2] - date_bbox[0]
                date_x = (430 + 874) // 2 - date_width // 2  # Center in date area
                date_y = (1032 + 1078) // 2 - (date_bbox[3] - date_bbox[1]) // 2  # Center vertically

                draw.text((date_x, date_y), formatted_date, fill="white", font=font_date)

                # Generate and add QR code - Funding coordinates
                qr_data = f"https://nairatrader.com/verify/{certificate_data['certificate_id']}"
                qr = qrcode.QRCode(version=1, box_size=10, border=0)
                qr.add_data(qr_data)
                qr.make(fit=True)

                qr_img = qr.make_image(fill_color="white", back_color="transparent")
                # Resize QR code to fit the area (160x166)
                qr_img = qr_img.resize((160, 160))  # Make it square

                # Position QR code at coordinates (420, 1191)
                image.paste(qr_img, (420, 1191), qr_img)

            elif certificate_data['certificate_type'] == 'payout':
                # Add name text (white, centered) - Payout coordinates: coords="105,543,1174,718"
                name_bbox = draw.textbbox((0, 0), certificate_data['user_name'], font=font_name)
                name_width = name_bbox[2] - name_bbox[0]
                name_x = (105 + 1174) // 2 - name_width // 2  # Center in name area
                name_y = (543 + 718) // 2 - (name_bbox[3] - name_bbox[1]) // 2  # Center vertically

                draw.text((name_x, name_y), certificate_data['user_name'], fill="white", font=font_name)

                # Add amount, account size, and date text - Payout coordinates: coords="183,771,988,1096"
                # Format: ₦50,000\n200k FUNDED ACCOUNT\n15TH FEBRUARY 2026

                # Format amount with proper comma separation
                amount_raw = certificate_data.get('amount', '50000')
                try:
                    # Add commas to the amount
                    amount_formatted = f"{int(amount_raw):,}"
                except:
                    amount_formatted = amount_raw

                amount_text = f"NGN {amount_formatted}"
                account_size_text = f" {certificate_data.get('account_size', '200K')} FUNDED ACCOUNT"

                # Calculate line heights for different fonts
                amount_line_height = font_amount.getbbox("A")[3] - font_amount.getbbox("A")[1] + 30  # Larger spacing for amount
                other_line_height = font_date.getbbox("A")[3] - font_date.getbbox("A")[1] + 25     # Larger spacing for others

                # Total height calculation
                total_text_height = amount_line_height + other_line_height + other_line_height

                # Center the multi-line text
                text_x = (183 + 988) // 2
                text_y = (771 + 1096) // 2 - total_text_height // 2

                # Draw amount line (larger font)
                amount_bbox = draw.textbbox((0, 0), amount_text, font=font_amount)
                amount_width = amount_bbox[2] - amount_bbox[0]
                amount_x = text_x - amount_width // 2
                amount_y = text_y
                draw.text((amount_x, amount_y), amount_text, fill="white", font=font_amount)

                # Draw account size line
                account_bbox = draw.textbbox((0, 0), account_size_text, font=font_date)
                account_width = account_bbox[2] - account_bbox[0]
                account_x = text_x - account_width // 2
                account_y = text_y + amount_line_height
                draw.text((account_x, account_y), account_size_text, fill="white", font=font_date)

                # Draw date line
                date_bbox = draw.textbbox((0, 0), formatted_date, font=font_date)
                date_width = date_bbox[2] - date_bbox[0]
                date_x = text_x - date_width // 2
                date_y = text_y + amount_line_height + other_line_height
                draw.text((date_x, date_y), formatted_date, fill="white", font=font_date)

                # Generate and add QR code - Payout coordinates: coords="413,1190,596,1357"
                qr_data = f"https://nairatrader.com/verify/{certificate_data['certificate_id']}"
                qr = qrcode.QRCode(version=1, box_size=10, border=0)
                qr.add_data(qr_data)
                qr.make(fit=True)

                qr_img = qr.make_image(fill_color="white", back_color="transparent")
                # Resize QR code to fit the area (183x167)
                qr_img = qr_img.resize((183, 167))

                # Position QR code at coordinates (413, 1190)
                image.paste(qr_img, (413, 1190), qr_img)

            # Convert to bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)

            return img_byte_arr.getvalue()

        except Exception as e:
            print(f"Error generating certificate image: {e}")
            # Fallback to text-based certificate
            pdf_content = f"""
            NairaTrader Certificate

            Certificate ID: {certificate_data['certificate_id']}
            User: {certificate_data['user_name']}
            Type: {certificate_data['certificate_type']}
            Title: {certificate_data['title']}
            Description: {certificate_data['description']}
            Generated: {certificate_data['generated_at']}

            NairaTrader Team
            """.encode('utf-8')
            return pdf_content

    def _upload_to_r2(self, file_content: bytes, file_key: str) -> str:
        """Upload file to Cloudflare R2 and return public URL"""
        try:
            # Create S3 client for Cloudflare R2
            s3_client = boto3.client(
                's3',
                endpoint_url=settings.cloudflare_r2_endpoint_url,
                aws_access_key_id=settings.cloudflare_r2_access_key_id,
                aws_secret_access_key=settings.cloudflare_r2_secret_access_key,
                region_name='auto'  # Cloudflare R2 uses 'auto' region
            )

            # Upload the file
            s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType='image/png',  # Since we're generating PNG images
                ACL='public-read'  # Make the file publicly accessible
            )

            # Return the public URL
            public_url = f"{settings.cloudflare_r2_public_url}/{file_key}"
            print(f"Successfully uploaded certificate to R2: {public_url}")
            return public_url

        except ClientError as e:
            print(f"Error uploading to R2: {e}")
            # Fallback to placeholder URL if upload fails
            return f"{settings.cloudflare_r2_public_url}/{file_key}"
        except Exception as e:
            print(f"Unexpected error uploading to R2: {e}")
            # Fallback to placeholder URL if upload fails
            return f"{settings.cloudflare_r2_public_url}/{file_key}"


# Global certificate service instance
certificate_service = CertificateService()


def get_certificate_service() -> CertificateService:
    return certificate_service