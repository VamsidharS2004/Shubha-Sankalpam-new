// Replace the retired public contact in legacy CMS copy as well as new edits.
// This never rewrites devotees' private profile/contact records.
function publicContact(value) {
  if(typeof value !== 'string') return value;
  return value.replace(/(?:\+?91[\s-]*)?9[\s-]*6[\s-]*7[\s-]*6[\s-]*7[\s-]*4[\s-]*3[\s-]*4[\s-]*4[\s-]*4(?!\d)/g,'917075568530');
}
module.exports={publicContact};
