import pulumi
import pulumi_static_website_provider as static_website_provider

site = static_website_provider.StaticWebsiteComponent(
    "static-website",
    static_website_provider.StaticWebsiteComponentArgs(
        static_directory = "website"
    )
)

pulumi.export('url', site.url)
