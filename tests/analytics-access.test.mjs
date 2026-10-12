import test from 'node:test';
import assert from 'node:assert/strict';
import {requireAnalyticsOwner} from '../functions/analytics-access.js';
test('Statistics require the published owner, even when another account has the same private project ID',async()=>{const db={doc:()=>({get:async()=>({data:()=>({ownerId:'alice'})})})};await requireAnalyticsOwner(db,'alice','shared-id');await assert.rejects(requireAnalyticsOwner(db,'bob','shared-id'),e=>e.code==='permission-denied');});
test('Missing publication cannot disclose residual statistics',async()=>{const db={doc:()=>({get:async()=>({data:()=>undefined})})};await assert.rejects(requireAnalyticsOwner(db,'alice','missing'),e=>e.code==='permission-denied');});
