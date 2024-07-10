import { expect, test } from 'vitest'
import { NovaClient } from '../src'

// TODO - jogging test

test('adds 1 + 2 to equal 3', () => {
  const nova = new NovaClient({
    instanceUrl: 'http://localhost:3000',
    cellId: 'cell',
  })

  expect(sum(1, 2)).toBe(3)
})
