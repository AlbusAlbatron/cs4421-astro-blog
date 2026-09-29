import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StaticSiteStack } from '../lib/static-site-stack';

test('CloudFront rewrites clean URLs to Astro directory indexes', () => {
	const app = new cdk.App();
	const stack = new StaticSiteStack(app, 'TestStack');
	const template = Template.fromStack(stack);

	template.hasResourceProperties('AWS::CloudFront::Function', {
		FunctionConfig: {
			Runtime: 'cloudfront-js-2.0',
		},
	});
	template.hasResourceProperties('AWS::CloudFront::Distribution', {
		DistributionConfig: {
			DefaultCacheBehavior: Match.objectLike({
				FunctionAssociations: Match.arrayWith([
					Match.objectLike({ EventType: 'viewer-request' }),
				]),
			}),
		},
	});
});
