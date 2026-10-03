const {send,readBody}=require('../utils/http');
const {readCatalog,saveCatalog}=require('../utils/catalogStore');
const {defaults,validateSchema}=require('../utils/bookingFormSchema');
async function loadForm(){const state=await readCatalog('ss_booking_forms');return {schema:state.rows[0]?.config||defaults(),revision:state.revision};}
async function getForm(req,res){try{send(res,200,{ok:true,...await loadForm()});}catch(e){send(res,503,{error:'Booking form configuration is unavailable. Check the booking-form SQL migration.'});}}
async function saveForm(req,res){try{
 const body=await readBody(req);let schema;try{schema=validateSchema(body.schema||{});}catch(e){return send(res,400,{error:e.message});}
 const state=await saveCatalog('ss_booking_forms',[{id:1,config:schema}],{revision:body.revision});send(res,200,{ok:true,schema,revision:state.revision});
}catch(e){send(res,e.status||503,{error:e.message});}}
module.exports={loadForm,getForm,saveForm};
