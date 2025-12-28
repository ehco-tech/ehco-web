// src/app/robots.ts

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin/',
                '/login',
                '/signup',
                '/profile'
            ],
        },
        sitemap: 'https://www.ehco.ai/sitemap.xml',
    }
}