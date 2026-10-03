const test=require('node:test');const assert=require('node:assert/strict');const {defaults,validateSchema,validateSubmission}=require('../backend/utils/bookingFormSchema');
const field=(key='city')=>({key,label:{en:'City',te:'నగరం'},placeholder:{},type:'text',scope:'both',required:true,visible:true,options:[]});
test('form schema rejects duplicate keys, unsupported controls and excessive fields',()=>{
 const valid=validateSchema({...defaults(),fields:[field()]});assert.equal(valid.fields[0].key,'city');
 assert.throws(()=>validateSchema({...defaults(),fields:[field(),field()]}));assert.throws(()=>validateSchema({...defaults(),fields:[{...field(),type:'payment'}]}));assert.throws(()=>validateSchema({...defaults(),fields:Array.from({length:13},(_,i)=>field('f'+i))}));
});
test('server validates required values and retains original translated labels',()=>{
 const schema=validateSchema({...defaults(),fields:[field()]});const item={cat:'Regular'};
 assert.throws(()=>validateSubmission(schema,{formLanguage:'te',customFields:{}},item));
 const saved=validateSubmission(schema,{formLanguage:'te',customFields:{city:'Ongole'}},item);assert.equal(saved[0].label,'నగరం');assert.equal(saved[0].value,'Ongole');schema.fields[0].label.te='Changed';assert.equal(saved[0].label,'నగరం');
});
test('hidden and differently scoped fields are not required; select and checkbox inputs validate',()=>{
 const schema=validateSchema({...defaults(),fields:[{...field(),scope:'special'},{...field('hidden'),visible:false},{...field('choice'),type:'select',options:['One','Two']},{...field('consent'),type:'checkbox'}]});
 assert.throws(()=>validateSubmission(schema,{customFields:{choice:'Invalid',consent:true}},{cat:'Regular'}));assert.throws(()=>validateSubmission(schema,{customFields:{choice:'One',consent:false}},{cat:'Regular'}));
 const saved=validateSubmission(schema,{customFields:{choice:'One',consent:true}},{cat:'Regular'});assert.deepEqual(saved.map(f=>f.key),['choice','consent']);
});
test('core optional settings are enforced; impossible calendar dates and invalid email are rejected',()=>{
 const schema=validateSchema({...defaults(),optional:{fGotram:{visible:true,required:true}},fields:[{...field('date'),type:'date'},{...field('email'),type:'email'}]});
 assert.throws(()=>validateSubmission(schema,{gotram:'',customFields:{}},{cat:'Regular'}));
 assert.throws(()=>validateSubmission(schema,{gotram:'Test',customFields:{date:'2026-02-30',email:'x@example.com'}},{cat:'Regular'}));
 assert.throws(()=>validateSubmission(schema,{gotram:'Test',customFields:{date:'2026-02-28',email:'bad'}},{cat:'Regular'}));
 assert.equal(validateSubmission(schema,{gotram:'Test',customFields:{date:'2026-02-28',email:'x@example.com'}},{cat:'Regular'}).length,2);
});
