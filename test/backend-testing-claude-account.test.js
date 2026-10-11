import test from 'node:test';
import assert from 'node:assert/strict';
import {homedir} from 'node:os';
import {validateClaudeAccountStatus,environment,sandbox} from '../benchmarks/backend-testing/run.mjs';
const account={configDir:'/private/example-selected-account',email:'selected@example.invalid'};
test('selected Claude account must be logged in under the exact requested identity',()=>{
  assert.deepEqual(validateClaudeAccountStatus(account,{loggedIn:true,email:account.email,accessToken:'must-not-return'}),{provider:'claude',contextId:'example-selected-account',email:account.email,loggedIn:true});
  assert.throws(()=>validateClaudeAccountStatus(account,{loggedIn:true,email:'default@example.invalid'}));
  assert.throws(()=>validateClaudeAccountStatus(account,{loggedIn:false,email:account.email}));
  assert.throws(()=>validateClaudeAccountStatus({...account,configDir:'relative'},{loggedIn:true,email:account.email}));
});
test('account context affects only Claude configuration and permits no context writes',()=>{
  const row={home:'/private/isolated/home',root:'/private/isolated',workspace:'/private/isolated/workspace'};
  assert.equal(environment(row).CLAUDE_CONFIG_DIR,'/private/isolated/home/.claude');
  assert.equal(environment({...row,claudeAccount:account}).CLAUDE_CONFIG_DIR,account.configDir);
  assert.equal(environment({...row,claudeAccount:account}).HOME,homedir());
  assert.equal(environment({...row,claudeAccount:account}).CODEX_HOME,row.home+'/.codex');
  const profile=sandbox({...row,claudeAccount:account},[]);
  assert.ok(profile.includes('(literal "/private/example-selected-account/.claude.json")'));
  assert.ok(!profile.includes('(subpath "/private/example-selected-account")'));
});
