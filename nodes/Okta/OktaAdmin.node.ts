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
		group: ['Productivity'],
		version: 1,
		description:
			'All usage of this Node begins with the creation of a client, the client handles the authentication and communication with the Okta API. You need to provide it with your Okta Domain and an API token. To obtain those, see https://developer.okta.com/code/rest/',
		defaults: {
			name: 'Okta Admin Node',
		},
		credentials: [
			{
				name: 'oktaCredentialsApi',
				required: true,
			},
		],
		inputs: ['main'],
		outputs: ['main'],
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
				description: 'This library is a wrapper for the https://developer.okta.com/docs/api/getting_started/api_test_client, which should be referred to as the source-of-truth for what is and isnt possible with the API',
			},
			{
				displayName: 'User Operations',
				name: 'userOperations',
				type: 'options',
				displayOptions: {
					show: {
						api: ['users'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'The https://developer.okta.com/docs/api/resources/users#create-user can be used to create users. The most basic type of user is one that has an email address and a password to login with.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Before deleting an Okta user, they must first be deactivated. Both operations are done with the https://developer.okta.com/docs/api/resources/users#lifecycle-operations.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'The https://developer.okta.com/docs/api/resources/users#get-user can be used to fetch a user by ID or login (as defined on their profile.login property)',
					},
					{
						name: 'List All Org Users',
						value: 'listAllOrgUsers',
						description:
							"The client can be used to fetch collections of resources, in this example we'll use the https://developer.okta.com/docs/api/resources/users#list-users",
					},
					{
						name: 'Search For Users',
						value: 'searchUser',
						description:
							'The https://developer.okta.com/docs/api/resources/users#list-users provides three ways to search for users, q, filter, or search, and all of these approaches can be achieved',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a user',
					},
				],
				default: 'create',
			},
			{
				displayName: 'JSON Payload',
				name: 'jsonPayload',
				type: 'json',
				default: `{
					profile: {
						firstName: 'Foo',
						lastName: 'Bar',
						email: 'foo@example.com',
						login: 'foo@example.com'
					},
					credentials: {
						password: {
							value: 'PasswordAbc123'
						}
					}
				}`,
				description:
					'For more information on the JSON payload, see https://developer.okta.com/docs/api/resources/users#create-user',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						api: ['users'],
						userOperations: ['create'],
					},
				},
			},
		],
	};
	that = this;

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;

		const credentials = await this.getCredentials('oktaCredentialsApi');
		const client = new _okta.Client({
			orgUrl: credentials.orgUrl.toString(),
			token: credentials.token.toString(),
		});

		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const oktaAPI = this.getNodeParameter('api', itemIndex, '') as string;
				const userOperations = this.getNodeParameter('userOperations', itemIndex, '') as string;

				if (oktaAPI === 'users') {
					if (userOperations === 'create') {
						const jsonPayload = this.getNodeParameter('jsonPayload', itemIndex, '') as string;
						const jsonPayloadParsed = JSON.parse(jsonPayload);
						const user = await client.createUser(jsonPayloadParsed);
					} else if (userOperations === 'get') {
						const userId = this.getNodeParameter('userId', itemIndex, '') as string;
						const user = await client.getUser(userId);
					} else if (userOperations === 'update') {
						const userId = this.getNodeParameter('userId', itemIndex, '') as string;
						const jsonPayload = this.getNodeParameter('jsonPayload', itemIndex, '') as string;
						const jsonPayloadParsed = JSON.parse(jsonPayload);
						const user = await client.updateUser(userId, jsonPayloadParsed);
					} else if (userOperations === 'delete') {
						const userId = this.getNodeParameter('userId', itemIndex, '') as string;
						const user = await client.deactivateUser(userId);
						await client.deactivateOrDeleteUser(userId);
					} else if (userOperations === 'listAllOrgUsers') {
						const users = await client.listUsers();

						users.subscribe({
							next: (user) => {
								console.log(user);
							},
							complete: () => {
								console.log('complete');
							},
							error: (err) => {
								console.error(err);
							},
						});

						item = items[itemIndex];
						item.json['allOrgUsers'] = users;
					} else if (userOperations === 'searchUser') {
						const searchType = this.getNodeParameter('searchType', itemIndex, '') as string;
						const searchValue = this.getNodeParameter('searchValue', itemIndex, '') as string;
						const searchQuery = this.getNodeParameter('searchQuery', itemIndex, '') as string;
						const searchFilter = this.getNodeParameter('searchFilter', itemIndex, '') as string;
						const searchSearch = this.getNodeParameter('searchSearch', itemIndex, '') as string;

						if (searchType === 'q') {
							const users = client.listUsers({ q: searchQuery });
						} else if (searchType === 'filter') {
							const users = client.listUsers({ filter: searchFilter });
						} else if (searchType === 'search') {
							const users = client.listUsers({ search: searchSearch });
						}
					}
				}

				//	item.json[ 'myString' ] = myString;
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(items);
	}
}
