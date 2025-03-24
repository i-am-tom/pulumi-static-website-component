import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { globSync } from "glob";
import { lookup } from "mime-types";

export interface StaticWebsiteComponentArgs {
  /**
   * The name of the bucket.
   */
  bucketName?: string;

  /**
   * A list of (glob) filepaths to deploy.
   */
  includedFiles?: string[];

  /**
   * The path of the static website root.
   */
  staticDirectory: string
}

export class StaticWebsiteComponent extends pulumi.ComponentResource {
  /**
   * The URL of the hosted website.
   */
  url?: pulumi.Output<string>;

  /**
   * The ID of the bucket we've created.
   */
  bucket?: pulumi.Output<string>;

  /**
   * This component creates an AWS bucket with a public access block and
   * ownership controls, then populates it with the contents of a given
   * directory. When complete, it outputs the ID of the bucket and the URL of
   * the published website.
   *
   * This is almost exactly a conversion of the quickstart into a component.
   * https://www.pulumi.com/docs/iac/get-started/aws
   */
  constructor(name: string, args: StaticWebsiteComponentArgs, opts?: pulumi.ComponentResourceOptions) {
    super("static-website-provider:index:StaticWebsiteComponent", name, args, opts)

    // We need the options in order to do anything.
    if (args == null)
      return

    const bucket = new aws.s3.BucketV2(args.bucketName || "static-website")

    const ownershipControls = new aws.s3.BucketOwnershipControls(
      "ownership-controls",
      {
        bucket: bucket.id,
        rule: {
            objectOwnership: "ObjectWriter"
        }
      }
    )

    const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      "public-access-block",
      {
        bucket: bucket.id,
        blockPublicAcls: false,
      }
    )

    const website = new aws.s3.BucketWebsiteConfigurationV2("website", {
      indexDocument: { suffix: "index.html" },
      bucket: bucket.id,
    })

    globSync(args.includedFiles || ['**'], {
      cwd: args.staticDirectory,
      nodir: true
    }).forEach(file => {
      const absolute = args.staticDirectory + '/' + file

      new aws.s3.BucketObject(file, {
        bucket: bucket.id,
        source: new pulumi.asset.FileAsset(absolute),
        contentType: lookup(file) || 'text/html',
        acl: "public-read",
      }, {
        dependsOn: [
          publicAccessBlock,
          ownershipControls,
          website
        ]
      })
    })

    this.url = pulumi.interpolate`http://${website.websiteEndpoint}`
    this.bucket = bucket.id
  }
}
