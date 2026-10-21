import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../passwords.ts';

test('password hashing runs on the supported runtime and uses a fresh salt', async () => {
    const password = 'A long password with Unicode: 日本語 🔐';
    const first = await hashPassword(password), second = await hashPassword(password);
    assert.notEqual(first, second);
    assert.equal(first.includes(password), false);
    assert.equal(await verifyPassword(password, first), true);
    assert.equal(await verifyPassword(password, second), true);
    assert.equal(await verifyPassword(`${password}!`, first), false);
});

test('malformed hashes and invalid password lengths fail closed', async () => {
    for (const hash of ['', 'plaintext', 'scrypt-v1$x$y', `scrypt-v2$${'A'.repeat(22)}$${'A'.repeat(86)}`,
        `scrypt-v1$${'A'.repeat(21)}B$${'A'.repeat(86)}`]) {
        assert.equal(await verifyPassword('password', hash), false);
    }
    for (const password of ['', 'x'.repeat(1025), '🔐'.repeat(257)]) {
        await assert.rejects(hashPassword(password), /Invalid password length/);
        assert.equal(await verifyPassword(password, 'malformed'), false);
    }
});

