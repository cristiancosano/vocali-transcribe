import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb'
import type { TranscriptionResponse } from '@vocali/contracts'

export type StoredTranscription = TranscriptionResponse & {
  userId: string
  contentType: string
  size: number
  text: string
}

export type TranscriptionCursor = Pick<StoredTranscription, 'id' | 'userId' | 'createdAt'>
type StoredTranscriptionSummary = Pick<StoredTranscription, 'id' | 'userId' | 'name' | 'createdAt'>

const offline = process.env.IS_OFFLINE === 'true'
const client = new DynamoDBClient(offline ? {
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
} : {})
const dynamo = DynamoDBDocumentClient.from(client)
let localTable: Promise<void> | undefined

function tableName() {
  if (!process.env.TRANSCRIPTIONS_TABLE) throw new Error('TRANSCRIPTIONS_TABLE is not configured')
  return process.env.TRANSCRIPTIONS_TABLE
}

async function ensureLocalTable() {
  if (!offline) return

  localTable ??= client.send(new CreateTableCommand({
    TableName: tableName(),
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' }
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [{
      IndexName: 'userId-createdAt-index',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'createdAt', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: ['name'] }
    }]
  })).then(() => undefined).catch(error => {
    if (error?.name !== 'ResourceInUseException') {
      localTable = undefined
      throw error
    }
  })

  await localTable
}

export async function createTranscription(transcription: StoredTranscription) {
  await ensureLocalTable()
  await dynamo.send(new PutCommand({
    TableName: tableName(),
    Item: transcription,
    ConditionExpression: 'attribute_not_exists(id)'
  }))
}

export async function findTranscription(id: string) {
  await ensureLocalTable()
  const result = await dynamo.send(new GetCommand({
    TableName: tableName(),
    Key: { id },
    ConsistentRead: true
  }))
  return (result.Item as StoredTranscription | undefined) ?? null
}

export async function listTranscriptions(userId: string, cursor?: TranscriptionCursor) {
  await ensureLocalTable()
  const result = await dynamo.send(new QueryCommand({
    TableName: tableName(),
    IndexName: 'userId-createdAt-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false,
    Limit: 11,
    ...(cursor ? { ExclusiveStartKey: cursor } : {})
  }))
  const items = (result.Items as StoredTranscriptionSummary[] | undefined) ?? []
  const cursorItem = items[9]
  return {
    items: items.slice(0, 10),
    cursor: items.length > 10 && cursorItem
      ? { id: cursorItem.id, userId: cursorItem.userId, createdAt: cursorItem.createdAt }
      : undefined
  }
}

export function publicTranscription({
  userId: _,
  contentType: __,
  size: ___,
  ...result
}: StoredTranscription) {
  return result
}
