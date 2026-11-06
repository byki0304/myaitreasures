const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const sample=()=>({meeting:'Friends',date:'2026-11-06',currency:'JPY',people:[{id:1,name:'A'},{id:2,name:'B'},{id:3,name:'C'}],expenses:[{id:4,detail:'Dinner',amount:'1000',tax:1,payer:1,members:[1,2,3]},{id:5,detail:'Snack',amount:'500',tax:2,payer:2,members:[1,2,3]},{id:6,detail:'Supplies',amount:'101',tax:3,payer:3,members:[1,2,3]}]});
const d=sample(),r=E.settle(d);
assert.equal(r.total,1727);
assert.deepEqual(r.rows.map(p=>p.share),[576,576,575]);
assert.deepEqual(r.transfers,[{from:2,to:1,amount:51},{from:3,to:1,amount:473}]);
d.expenses[0].members=[1,2];
assert.deepEqual(E.settle(d).rows.map(p=>p.share),[759,759,209]);
assert.deepEqual(E.settle(d).transfers,[{from:2,to:1,amount:234},{from:3,to:1,amount:107}]);
assert.equal(E.tax({amount:'15',tax:1}),2);
assert.deepEqual([0,1,2,3].map(tax=>E.final({amount:'1000',tax})),[1000,1100,1050,1010]);
const single=sample();single.expenses=[{id:4,detail:'Bill',amount:'1000',tax:0,payer:3,members:[1,2]}];
assert.deepEqual(E.settle(single).rows.map(p=>p.share),[500,500,0]);
assert.deepEqual(E.settle(single).transfers,[{from:1,to:3,amount:500},{from:2,to:3,amount:500}]);
const rem=sample();rem.expenses=[{id:4,detail:'Bill',amount:'1000',tax:0,payer:1,members:[3,2,1]}];
assert.deepEqual(E.settle(rem).rows.map(p=>p.share),[334,333,333]);
const even=sample();even.expenses=even.people.map((p,i)=>({id:i+4,detail:'Bill',amount:'300',tax:0,payer:p.id,members:[1,2,3]}));assert.equal(E.settle(even).transfers.length,0);
for(const amount of ['', '0','-1','1.5','1e3','NaN','1000000001']){const bad=sample();bad.expenses[0].amount=amount;assert.ok(E.validate(bad)['amount-4']);assert.throws(()=>E.settle(bad));}
for(const date of ['2026-02-30','2025-02-29','2026-13-01',''])assert.equal(E.validDate(date),false);
assert.equal(E.validDate('2024-02-29'),true);
const bad=sample();bad.people[1].name=' A ';assert.equal(E.validate(bad)['person-2'],'duplicateError');
bad.expenses[0].members=[];assert.equal(E.validate(bad)['members-4'],'membersError');
const limit=sample();limit.expenses[0].amount='1000000000';assert.equal(E.validate(limit).expenses,'totalError');
let cases=0;
for(let n=2;n<=20;n++)for(let k=0;k<80;k++){
 const data={meeting:'Property',date:'2026-11-06',currency:k%2?'JPY':'KRW',people:Array.from({length:n},(_,i)=>({id:i+1,name:String(i+1)})),expenses:[]};
 for(let j=0;j<9;j++){let members=data.people.filter((_,i)=>(i+j+k)%3!==0).map(p=>p.id);if(!members.length)members=[1];data.expenses.push({id:j+100,detail:'Bill',amount:String(1+(k+3)*(j+7)),tax:j%4,payer:(j+k)%n+1,members});}
 const x=E.settle(data);assert.equal(x.rows.reduce((s,p)=>s+p.share,0),x.total);assert.equal(x.rows.reduce((s,p)=>s+p.paid,0),x.total);
 for(const p of x.rows){const sent=x.transfers.filter(t=>t.from===p.id).reduce((s,t)=>s+t.amount,0),got=x.transfers.filter(t=>t.to===p.id).reduce((s,t)=>s+t.amount,0);assert.equal(p.paid+sent-got,p.share);}
 assert.ok(x.transfers.every(t=>Number.isInteger(t.amount)&&t.amount>0));cases++;
}
console.log(`PASS: specification examples, tax, exclusions, remainder order, validation, ${cases} conservation cases`);
