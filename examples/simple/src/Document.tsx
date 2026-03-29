import React from 'react'

export default function Document({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <head>
                <title>ERROR</title>
            </head>
            <body>{children}</body>
        </html>
    )
}
