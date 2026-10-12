import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'node:path';

export class StaticSiteStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'SiteVpc', {
            maxAzs: 2,
            natGateways: 1,
        });

        const cluster = new ecs.Cluster(this, 'SiteCluster', { vpc });
        const image = ecs.ContainerImage.fromDockerImageAsset(new ecrAssets.DockerImageAsset(this, 'SiteImage', {
            directory: path.join(__dirname, '../..'),
        }));
        const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'SiteService', {
            cluster,
            publicLoadBalancer: true,
            desiredCount: 1,
            taskImageOptions: {
                image,
                containerPort: 4321,
            },
            taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            assignPublicIp: false,
        });
        service.targetGroup.configureHealthCheck({
            path: '/api/health',
        });

        const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
            defaultBehavior: {
                origin: new origins.HttpOrigin(service.loadBalancer.loadBalancerDnsName, {
                    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
                }),
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
            },
        });

        new cdk.CfnOutput(this, 'CloudFrontDomainName', {
            value: distribution.distributionDomainName,
        });
    }
}
