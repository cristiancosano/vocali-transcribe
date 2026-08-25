import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { AuthUser } from '@vocali/contracts'

export type StoredSession = AuthUser & {
  refreshToken: string
  expiresAt: number
}

const offline = process.env.IS_OFFLINE === 'true'
const client = new DynamoDBClient(offline ? {
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
} : {})
const dynamo = DynamoDBDocumentClient.from(client)
let localTable: Promise<void> | undefined

function tableName() {
  if (!process.env.SESSIONS_TABLE) throw new Error('SESSIONS_TABLE is not configured')
  return process.env.SESSIONS_TABLE
}

async function ensureLocalTable() {
  if (!offline) return

  localTable ??= client.send(new CreateTableCommand({
    TableName: tableName(),
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'sessionId', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'sessionId', KeyType: 'HASH' }]
  })).then(() => undefined).catch(error => {
    if (error?.name !== 'ResourceInUseException') {
      localTable = undefined
      throw error
    }
  })

  await localTable
}

export async function putSession(key: string, session: StoredSession) {
  await ensureLocalTable()
  await dynamo.send(new PutCommand({
    TableName: tableName(),
    Item: { sessionId: key, ...session }
  }))
}

export async function getSession(key: string) {
  await ensureLocalTable()
  const result = await dynamo.send(new GetCommand({
    TableName: tableName(),
    Key: { sessionId: key },
    ConsistentRead: true
  }))
  return (result.Item as StoredSession | undefined) ?? null
}

export async function deleteStoredSession(key: string) {
  await ensureLocalTable()
  await dynamo.send(new DeleteCommand({
    TableName: tableName(),
    Key: { sessionId: key }
  }))
}
