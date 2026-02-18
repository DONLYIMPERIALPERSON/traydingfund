interface TitleProps {
    title?: string;
    heading?: string;
    description?: string;
}

export default function Title({ title, heading, description }: TitleProps) {

    return (
        <div className="text-center mb-16">
            {title && (
                <p className="text-sm font-medium text-yellow-400 uppercase tracking-wide mb-3">
                    {title}
                </p>
            )}
            {heading && (
                <h2 className="text-2xl md:text-4xl text-white font-semibold">
                    {heading}
                </h2>
            )}
            {description && (
                <p className='max-w-md mx-auto text-sm text-gray-400 my-3'>
                    {description}
                </p>
            )}
        </div>
    )
}