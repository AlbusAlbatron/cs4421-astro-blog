import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class StaticSiteStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'SiteVpc', {
            maxAzs: 2,
            natGateways: 1,
        });

        const cluster = new ecs.Cluster(this, 'SiteCluster', { vpc });
        const repository = ecr.Repository.fromRepositoryName(this, 'SiteRepository', 'astro-blog');
        const imageTag = this.node.tryGetContext('imageTag');

        if (typeof imageTag !== 'string' || imageTag.length === 0) {
            throw new Error('The imageTag CDK context value is required.');
        }

        const image = ecs.ContainerImage.fromEcrRepository(repository, imageTag);
        const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'SiteService', {
            cluster,
            publicLoadBalancer: true,
            desiredCount: 1,
            circuitBreaker: { rollback: true },
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
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
