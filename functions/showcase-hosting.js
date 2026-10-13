// Operator-owned existing demonstration only. This is not a customer entitlement.
// Exact host, project and owner must match; publication/suspension/lifecycle checks still apply.
export function isOperatorShowcase(host,mapping,site){
 return ['northline.pagegenie.ca','pagegenie-domain-test.com'].includes(host)
  && mapping?.projectId==='d3e3a063-a1e3-49d4-b487-55b633eb4c27'
  && mapping?.uid==='9Pv4uDwtRYbE3aRdshFTMsNWuID3'
  && site?.ownerId===mapping.uid;
}
