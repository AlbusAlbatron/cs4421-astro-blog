import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StaticSiteStack } from '../lib/static-site-stack';

test('CloudFront routes requests to the SSR service', () => {
	const app = new cdk.App();
	const stack = new StaticSiteStack(app, 'TestStack');
	const template = Template.fromStack(stack);

	template.hasResourceProperties('AWS::CloudFront::Distribution', {
		DistributionConfig: {
			DefaultCacheBehavior: Match.objectLike({
				AllowedMethods: Match.arrayWith(['GET', 'POST']),
			}),
		},
	});
	template.resourceCountIs('AWS::ECS::Service', 1);
});
