import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import * as _okta from '@okta/okta-sdk-nodejs';
import { Client } from '@okta/okta-sdk-nodejs';

export class OktaAdmin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Okta Admin',
		name: 'OktaAdmin',
		group: [ 'Productivity' ],
		version: 1,
		description: 'All usage of this Node begins with the creation of a client, the client handles the authentication and communication with the Okta API. You need to provide it with your Okta Domain and an API token. To obtain those, see https://developer.okta.com/code/rest/',
		defaults: {
			name: 'Okta Admin Node',
		},
		credentials: [
			{
				name: 'oktaCredentialsApi',
				required: true,
			},
		],
		inputs: [ 'main' ],
		outputs: [ 'main' ],
		properties: [
			{
				displayName: 'API',
				name: 'api',
				type: 'options',
				options: [
					{
						name: 'Users',
						value: 'users',
					},
					{
						name: 'Groups',
						value: 'groups',
					},
					{
						name: 'Applications',
						value: 'application',
					},
					{
						name: 'System Logs',
						value: 'systemLogs',
					},
				],
				default: 'users',
				description: 'This library is a wrapper for the https://developer.okta.com/docs/api/getting_started/api_test_client, which should be referred to as the source-of-truth for what is and isnt possible with the API.',
			}
		],
	};
	that = this;

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute ( this: IExecuteFunctions ): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;

		const credentials = await this.getCredentials( 'oktaCredentialsApi' );
		const client = new _okta.Client( {
			orgUrl: credentials.orgUrl.toString(),
			token: credentials.token.toString()
		} );



		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for ( let itemIndex = 0; itemIndex < items.length; itemIndex++ ) {
			try {
				//		myString = this.getNodeParameter( 'myString', itemIndex, '' ) as string;
				item = items[ itemIndex ];

				//	item.json[ 'myString' ] = myString;
			} catch ( error ) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if ( this.continueOnFail() ) {
					items.push( { json: this.getInputData( itemIndex )[ 0 ].json, error, pairedItem: itemIndex } );
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if ( error.context ) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError( this.getNode(), error, {
						itemIndex,
					} );
				}
			}
		}

		return this.prepareOutputData( items );
	}

}
