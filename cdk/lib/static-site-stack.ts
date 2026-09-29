import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class StaticSiteStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        const cleanUrlFunction = new cloudfront.Function(this, 'CleanUrlFunction', {
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            code: cloudfront.FunctionCode.fromInline(`function handler(event) {
    var request = event.request;
    var uri = request.uri;

    if (uri !== '/' && uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    } else if (uri !== '/' && !uri.substring(uri.lastIndexOf('/') + 1).includes('.')) {
        request.uri = uri + '/index.html';
    }

    return request;
}`),
        });

        const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
                functionAssociations: [{
                    function: cleanUrlFunction,
                    eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                }],
            },
            defaultRootObject: 'index.html',
        });

        new s3deploy.BucketDeployment(this, 'DeploySite', {
            sources: [s3deploy.Source.asset('../dist')],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*'], // Automatic CloudFront CDN cache invalidation!
        });
    }
}
