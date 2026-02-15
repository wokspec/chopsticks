import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { data as helpCommand } from '../../src/commands/help.js';

describe('Help command definition', function () {
  it('supports single query dropdown with autocomplete', function () {
    const json = helpCommand.toJSON();
    const optionMap = new Map((json.options || []).map(o => [o.name, o]));

    assert.ok(optionMap.has('query'));
    assert.equal(optionMap.get('query').autocomplete, true);
    assert.equal(optionMap.size, 1);
  });
});
