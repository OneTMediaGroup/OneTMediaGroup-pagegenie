export const CA_REQUIREMENTS_URL='https://www.cira.ca/en/resources/documents/domains/canadian-presence-requirements-registrants/';
export const CA_AGREEMENT_URL='https://www.cira.ca/uploads/2025/08/Registrant-Agreement-Version-2.3-August-1-2025.pdf';
export const CA_CONSENT_VERSION='cpr-1.3_agreement-2.3';
export const CA_CATEGORIES=[
 ['citizen','Canadian citizen'],['permanent-resident','Permanent resident ordinarily living in Canada'],['corporation','Corporation incorporated in Canada'],
 ['legal-representative','Legal representative of an eligible individual'],['trust','Eligible Canadian trust'],['partnership','Eligible Canadian partnership'],['association','Eligible Canadian association'],['trade-union','Canadian trade union'],['political-party','Registered Canadian political party'],['education','Canadian educational institution'],['library-museum','Canadian library, archive or museum'],['crown','The Crown'],['band','First Nation band or group of bands'],['indigenous','Indigenous individual or collectivity in Canada'],['government','Canadian government or government entity'],['hospital','Canadian hospital'],['trademark','Owner of a registered Canadian trademark'],['official-mark','Holder of a Canadian official mark']
];
export const CIRA_EMAIL_NOTICE='After registering your .ca domain, you may receive an email from CIRA—the Canadian Internet Registration Authority, which manages .ca domains—with information about your domain and available resources. This is expected. If you are unsure about a message, contact support@pagegenie.ca before clicking its links.';
export function validateCaEligibility(input){
 if(!input||!CA_CATEGORIES.some(([id])=>id===input.category))throw Error('Choose how the domain owner meets CIRA’s Canadian Presence Requirements.');
 if(input.eligible!==true)throw Error('Confirm that the domain owner meets CIRA’s requirements for the selected category.');
 if(input.agreementAccepted!==true||input.version!==CA_CONSENT_VERSION)throw Error('Read and accept the current CIRA Registrant Agreement.');
 return {category:input.category,eligible:true,agreementAccepted:true,version:CA_CONSENT_VERSION};
}
