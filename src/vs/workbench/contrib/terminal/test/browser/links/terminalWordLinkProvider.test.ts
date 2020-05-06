/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Terminal, ILink, IBufferRange, IBufferCellPosition } from 'xterm';
import { TerminalWordLinkProvider } from 'vs/workbench/contrib/terminal/browser/links/terminalWordLinkProvider';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';

suite.only('Workbench - TerminalWordLinkProvider', () => {

	let instantiationService: TestInstantiationService;
	let configurationService: TestConfigurationService;

	setup(() => {
		instantiationService = new TestInstantiationService();
		configurationService = new TestConfigurationService();
		instantiationService.stub(IConfigurationService, configurationService);
	});

	async function assertLink2(text: string, expected: { text: string, range: [number, number][] }[]) {
		const xterm = new Terminal();
		const provider: TerminalWordLinkProvider = instantiationService.createInstance(TerminalWordLinkProvider, xterm, () => { }, () => { });

		// Write the text and wait for the parser to finish
		await new Promise<void>(r => xterm.write(text, r));

		// Ensure all links are provided
		const links = (await new Promise<ILink[] | undefined>(r => provider.provideLinks(1, r)))!;
		assert.equal(links.length, expected.length);
		const actual = links.map(e => ({
			text: e.text,
			range: e.range
		}));
		const expectedVerbose = expected.map(e => ({
			text: e.text,
			range: {
				start: { x: e.range[0][0], y: e.range[0][1] },
				end: { x: e.range[1][0], y: e.range[1][1] },
			}
		}));
		assert.deepEqual(actual, expectedVerbose);
	}

	test('should link words as defined by wordSeparators', async () => {
		await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ()[]' } });
		await assertLink2('foo', [{ range: [[1, 1], [3, 1]], text: 'foo' }]);
		await assertLink2('foo', [{ range: [[1, 1], [3, 1]], text: 'foo' }]);
		await assertLink2(' foo ', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
		await assertLink2('(foo)', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
		await assertLink2('[foo]', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
		await assertLink2('{foo}', [{ range: [[1, 1], [5, 1]], text: '{foo}' }]);

		await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
		await assertLink2('foo', [{ range: [[1, 1], [3, 1]], text: 'foo' }]);
		await assertLink2(' foo ', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
		await assertLink2('(foo)', [{ range: [[1, 1], [5, 1]], text: '(foo)' }]);
		await assertLink2('[foo]', [{ range: [[1, 1], [5, 1]], text: '[foo]' }]);
		await assertLink2('{foo}', [{ range: [[1, 1], [5, 1]], text: '{foo}' }]);
	});

	test('should support wide characters', async () => {
		await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' []' } });
		await assertLink2('aabbccdd.txt ', [{ range: [[1, 1], [12, 1]], text: 'aabbccdd.txt' }]);
		await assertLink2('我是学生.txt ', [{ range: [[1, 1], [12, 1]], text: '我是学生.txt' }]);
		await assertLink2(' aabbccdd.txt ', [{ range: [[2, 1], [13, 1]], text: 'aabbccdd.txt' }]);
		await assertLink2(' 我是学生.txt ', [{ range: [[2, 1], [13, 1]], text: '我是学生.txt' }]);
		await assertLink2(' [aabbccdd.txt] ', [{ range: [[3, 1], [14, 1]], text: 'aabbccdd.txt' }]);
		await assertLink2(' [我是学生.txt] ', [{ range: [[3, 1], [14, 1]], text: '我是学生.txt' }]);
	});
});
