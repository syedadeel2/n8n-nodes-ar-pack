import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";
import * as sqlite3 from 'sqlite3';
import path from 'path';

export class Sqlite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sqlite3 Node',
		name: 'SqliteNode',
		group: ['Data & Storage'],
		version: 1,
		description: 'Sqlite3 Db provider',
		defaults: {
			name: 'Sqlite3 Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Db Type',
				name: 'dbType',
				type: 'options',
				options: [
					{
						name: 'In-Memory',
						value: ':memory:',
					},
					{
						name: 'File',
						value: 'file',
					},
				],
				default: ':memory:',
			},
			{
				displayName: 'Db File',
				name: 'dbFile',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						dbType: ['file'],
					},
				},
			},
			{
				displayName: 'Command Type',
				name: 'commandType',
				type: 'options',
				default: 'run',
				description: 'The type of command to execute',
				options: [
					{
						name: 'Run',
						value: 'run',
						description: 'Run a command that does not return any data',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Run a command that returns a single row',
					},
					{
						name: 'All',
						value: 'all',
						description: 'Run a command that returns multiple rows',
					},
				],
				required: true,
			},
			{
				displayName: 'SQL Statement',
				name: 'sql',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Write your SQL statement here',
				required: true,
			}
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let dbType: string = this.getNodeParameter('dbType', 0) as string;

		let db: any;

		// create sqlite3 connection
		if (dbType === ':memory:') {
			db = new sqlite3.Database(dbType);
		} else {
			const dbFile: string = this.getNodeParameter('dbFile', 0) as string;

			db = await new Promise<any>((resolve, reject) => {
				let db1: sqlite3.Database;
				db1 = new sqlite3.Database(path.resolve(__dirname, `${dbFile}.db`), (err) => {
					if (err) {
						reject(err);
					} else {
						resolve(db1);
					}
				});
			});

			if (db instanceof Error) {
				throw new NodeOperationError(this.getNode(), db);
			}
		}


		// run sql statement
		const sql: string = this.getNodeParameter('sql', 0) as string;
		const commandType: string = this.getNodeParameter('commandType', 0) as string;

		let result: any;

		if (commandType === 'run') {

			result = await new Promise<void>((resolve, reject) => {
				db.run(sql, (err: any) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

		} else if (commandType === 'get') {

			result = await new Promise<any>((resolve, reject) => {
				db.get(sql, (err: any, row: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(row);
					}
				});
			});

		} else if (commandType === 'all') {

			result = await new Promise<any[]>((resolve, reject) => {
				db.all(sql, (err: any, rows: any[]) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
				});
			});

		}

		// close connection
		db.close();

		// return result
		return this.prepareOutputData(this.helpers.returnJsonArray(result as any));


		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		// for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		// 	try {
		// 		version = this.getNodeParameter('version', 0) as string;
		// 		item = items[itemIndex];

		// 		item.json['uuid'] = version == 'v1' ? uuidv1() : version == 'v4' ? uuidv4() : null;
		// 	} catch (error) {
		// 		// This node should never fail but we want to showcase how
		// 		// to handle errors.
		// 		if (this.continueOnFail()) {
		// 			items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
		// 		} else {
		// 			// Adding `itemIndex` allows other workflows to handle this error
		// 			if (error.context) {
		// 				// If the error thrown already contains the context property,
		// 				// only append the itemIndex
		// 				error.context.itemIndex = itemIndex;
		// 				throw error;
		// 			}
		// 			throw new NodeOperationError(this.getNode(), error, {
		// 				itemIndex,
		// 			});
		// 		}
		// 	}
		// }


		//return this.prepareOutputData(items);
	}
}
