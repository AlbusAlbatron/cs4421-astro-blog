import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StaticSiteStack } from '../lib/static-site-stack';

test('CloudFront routes requests to the SSR service', () => {
	const app = new cdk.App({ context: { imageTag: 'latest' } });
	const stack = new StaticSiteStack(app, 'TestStack', {
		env: { account: '802690829042', region: 'us-east-1' },
	});
	const template = Template.fromStack(stack);

	template.hasResourceProperties('AWS::CloudFront::Distribution', {
		DistributionConfig: {
			DefaultCacheBehavior: Match.objectLike({
				AllowedMethods: Match.arrayWith(['GET', 'POST']),
			}),
		},
	});
	template.resourceCountIs('AWS::ECS::Service', 1);
	template.hasResourceProperties('AWS::ECS::TaskDefinition', {
		ContainerDefinitions: Match.arrayWith([
			Match.objectLike({
				Image: {
					'Fn::Join': [
						'',
						['802690829042.dkr.ecr.us-east-1.', { Ref: 'AWS::URLSuffix' }, '/astro-blog:latest'],
					],
				},
			}),
		]),
	});
});
