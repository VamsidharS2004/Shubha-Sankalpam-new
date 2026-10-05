// Request all pages explicitly; Supabase's default row limit is not a full export.
async function pagedRead(makeQuery){
 const rows=[];const pageSize=500;
 for(let offset=0;;offset+=pageSize){
  const {data,error}=await makeQuery().range(offset,offset+pageSize-1);
  if(error){const e=new Error('Database records could not be loaded. Please retry; existing data was preserved.');e.status=503;throw e;}
  rows.push(...(data||[]));if(!data||data.length<pageSize)return rows;
 }
}
module.exports={pagedRead};
