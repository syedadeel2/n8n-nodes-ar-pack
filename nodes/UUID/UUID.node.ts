import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";

export class UUID implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UUID Node',
		name: 'UUIDNode',
		group: [ 'Miscellaneous' ],
		version: 1,
		description: 'Generates UUID',
		defaults: {
			name: 'UUID Node',
		},
		inputs: [ 'main' ],
		outputs: [ 'main' ],
		properties: [
			{
				displayName: 'UUID Version',
				name: 'version',
				type: 'options',
				options: [
					{
						name: 'v1',
						value: 'v1',
					},
					{
						name: 'v4',
						value: 'v4',
					},
				],
				default: 'v4',
				description: 'UUID Version',
			}
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute ( this: IExecuteFunctions ): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let version: string;

		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for ( let itemIndex = 0; itemIndex < items.length; itemIndex++ ) {
			try {
				version = this.getNodeParameter( 'version', 0 ) as string;
				item = items[ itemIndex ];

				item.json[ 'uuid' ] = version == 'v1' ? uuidv1() : version == 'v4' ? uuidv4() : null;
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
