/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { addTopics } from '../../src/commands/dev/generate/command.js';
import { Topic } from '../../src/types.js';

describe('command generator', () => {
  describe('addTopics : external', () => {
    it('should return empty when top-level command (no topic)', () => {
      const sampleNoSubtopics: Record<string, Topic> = { bar: { description: 'blah' } };
      const sampleCommands = ['bar.whatever'];
      const topics = addTopics('foo', sampleNoSubtopics, sampleCommands);
      expect(topics).to.deep.equal({});
    });
    it('should return description when non-top-level command', () => {
      const sampleNoSubtopics: Record<string, Topic> = { bar: { description: 'blah' } };
      const sampleCommands = ['bar.whatever'];
      const topics = addTopics('foo:fooz', sampleNoSubtopics, sampleCommands);
      expect(topics).to.deep.equal({ foo: { description: 'description for foo' } });
    });
    it('should be external because top-level topic exists as command', () => {
      const sampleNoSubtopics: Record<string, Topic> = { bar: { description: 'blah' } };
      const sampleCommands = ['bar'];
      const topics = addTopics('bar:whatever', sampleNoSubtopics, sampleCommands);
      expect(topics).to.deep.equal({ bar: { external: true } });
    });
    it('should be external because top-level topic exists with commands inside it', () => {
      const sampleNoSubtopics: Record<string, Topic> = { bar: { description: 'blah' } };
      const sampleCommands = ['bar.existing'];
      const topics = addTopics('bar:whatever', sampleNoSubtopics, sampleCommands);
      expect(topics).to.deep.equal({ bar: { external: true } });
    });
    it('should be external at 2 levels because level 2 topic exists as command', () => {
      const sampleNoSubtopics: Record<string, Topic> = {
        bar: { description: 'blah' },
      };
      const sampleCommands = ['bar.sub', 'bar.sub.b'];
      const topics = addTopics('bar:sub:c', sampleNoSubtopics, sampleCommands);
      expect(topics).to.deep.equal({
        bar: { external: true, subtopics: { sub: { external: true } } },
      });
    });
    it('should be external at 2 levels because top-level topic exists with commands inside it', () => {
      const sampleNoSubtopics: Record<string, Topic> = {
        bar: { description: 'blah', subtopics: { sub: { description: 'original subtopic desc' } } },
      };
      const sampleCommands = ['bar.sub.a', 'bar.sub.b'];
      const topics = addTopics('bar:sub:c', sampleNoSubtopics, sampleCommands);
      expect(topics).to.deep.equal({
        bar: { external: true, subtopics: { sub: { external: true } } },
      });
    });
    it('should be external at 1 levels but have description (not external) on subtopic', () => {
      const sampleNoSubtopics: Record<string, Topic> = {
        bar: { description: 'blah' },
      };
      const sampleCommands = ['bar.sub.a', 'bar.sub.b'];
      const topics = addTopics('bar:newsub:c', sampleNoSubtopics, sampleCommands);
      expect(topics).to.deep.equal({
        bar: { external: true, subtopics: { newsub: { description: 'description for bar.newsub' } } },
      });
    });
  });
});
