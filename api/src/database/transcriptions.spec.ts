import { beforeEach, describe, expect, it, vi } from 'vitest'

const dynamoSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-dynamodb', () => ({
  CreateTableCommand: class { constructor(readonly input: unknown) {} },
  DynamoDBClient: class { send = vi.fn() }
}))
vi.mock('@aws-sdk/lib-dynamodb', () => {
  class Command { constructor(readonly input: Record<string, unknown>) {} }
  class GetCommand extends Command {}
  class PutCommand extends Command {}
  class QueryCommand extends Command {}
  return {
    DynamoDBDocumentClient: { from: () => ({ send: dynamoSend }) },
    GetCommand,
    PutCommand,
    QueryCommand
  }
})

import {
  createTranscription,
  findTranscription,
  listTranscriptions
} from './transcriptions.js'

const transcription = {
  id: 'id-1',
  userId: 'user-id',
  name: 'audio.mp3',
  contentType: 'audio/mpeg',
  size: 1024,
  text: 'Texto completo.',
  createdAt: '2026-08-26T10:00:00.000Z',
}

describe('transcripciones completadas', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('TRANSCRIPTIONS_TABLE', 'transcriptions')
  })

  it('crea una única transcripción completa y permite consultarla', async () => {
    const cursor = { id: 'previous-id', userId: 'user-id', createdAt: '2026-08-25T10:00:00.000Z' }
    const summary = { id: transcription.id, userId: transcription.userId, name: transcription.name, createdAt: transcription.createdAt }
    dynamoSend.mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: transcription })
      .mockResolvedValueOnce({ Items: [summary], LastEvaluatedKey: cursor })

    await createTranscription(transcription)
    expect(await findTranscription('id-1')).toEqual(transcription)
    expect(await listTranscriptions('user-id', cursor)).toEqual({ items: [summary], cursor: undefined })

    expect(dynamoSend.mock.calls[0]![0].input).toMatchObject({
      Item: expect.objectContaining({ text: 'Texto completo.' }),
      ConditionExpression: 'attribute_not_exists(id)'
    })
    expect(dynamoSend.mock.calls[2]![0].input).toMatchObject({
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': 'user-id' },
      ScanIndexForward: false,
      Limit: 11,
      ExclusiveStartKey: cursor
    })
  })

  it('solo devuelve cursor cuando existe una transcripción undécima', async () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      id: `id-${index + 1}`,
      userId: 'user-id',
      name: `audio-${index + 1}.mp3`,
      createdAt: new Date(2026, 7, 26, 12, 0, -index).toISOString()
    }))
    dynamoSend.mockResolvedValueOnce({ Items: items.slice(0, 10), LastEvaluatedKey: items[9] })
      .mockResolvedValueOnce({ Items: items })

    expect(await listTranscriptions('user-id')).toEqual({ items: items.slice(0, 10), cursor: undefined })
    expect(await listTranscriptions('user-id')).toEqual({
      items: items.slice(0, 10),
      cursor: { id: items[9]!.id, userId: 'user-id', createdAt: items[9]!.createdAt }
    })
  })
})
