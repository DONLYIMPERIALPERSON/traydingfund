export type EmailTemplatePayload = {
  title: string
  subtitle: string
  content: string
  buttonText: string
  buttonLink: string
  infoBox: string
  year?: string
}

const TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MACHEFUNDED</title>
</head>

<body style="margin:0; padding:0; background-color:#0f2f33;">

<!-- WRAPPER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f2f33;">
<tr>
<td align="center">

<!-- CONTAINER -->
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:0; overflow:hidden; font-family: Arial, Helvetica, sans-serif;">

<!-- HEADER -->
<tr>
<td style="background: linear-gradient(135deg, #1f8a94, #146c73); padding:20px;">

<table width="100%">
<tr>

<td align="left">
<img src="https://pub-e47c37a6a0b447288c2210b9e8f6faf5.r2.dev/login-page-logo.png" width="50" alt="MACHEFUNDED" />
</td>

<td align="right" style="color:#ffffff; font-weight:600; font-size:18px; letter-spacing:1px;">
MACHEFUNDED
</td>

</tr>
</table>

</td>
</tr>

<!-- HERO / TITLE -->
<tr>
<td style="padding:30px 25px 10px 25px; text-align:left;">

<h1 style="margin:0; font-size:22px; color:#0f2f33;">
{{title}}
</h1>

<p style="margin:10px 0 0 0; color:#6b7c80; font-size:14px;">
{{subtitle}}
</p>

</td>
</tr>

<!-- CONTENT -->
<tr>
<td style="padding:20px 25px; color:#333333; font-size:15px; line-height:1.6;">

{{content}}

</td>
</tr>

<!-- BUTTON -->
<tr>
<td align="center" style="padding:10px 25px 30px 25px;">

<a href="{{button_link}}" style="
display:inline-block;
padding:12px 25px;
background-color:#1f8a94;
color:#ffffff;
text-decoration:none;
border-radius:6px;
font-size:14px;
font-weight:600;
">
{{button_text}}
</a>

</td>
</tr>

<!-- INFO BOX -->
<tr>
<td style="padding:0 25px 25px 25px;">

<div style="
background-color:#f4f8f9;
padding:15px;
border-radius:8px;
font-size:13px;
color:#555;
">

{{info_box}}

</div>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background-color:#0f2f33; padding:25px; text-align:center;">

<p style="margin:0; color:#ffffff; font-size:13px;">
© {{year}} MACHEFUNDED. All rights reserved.
</p>

<p style="margin:8px 0 0 0; font-size:12px;">
<a href="https://machefunded.com" style="color:#1f8a94; text-decoration:none;">
machefunded.com
</a>
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`

export const buildEmailTemplate = (payload: EmailTemplatePayload) => {
  const year = payload.year ?? new Date().getFullYear().toString()
  return TEMPLATE
    .replace('{{title}}', payload.title)
    .replace('{{subtitle}}', payload.subtitle)
    .replace('{{content}}', payload.content)
    .replace('{{button_text}}', payload.buttonText)
    .replace('{{button_link}}', payload.buttonLink)
    .replace('{{info_box}}', payload.infoBox)
    .replace('{{year}}', year)
}