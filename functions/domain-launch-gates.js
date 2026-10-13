export function liveDomainProcessingEnabled(config){return config?.testMode===false&&config?.liveDomainProcessing===true;}
export function liveDomainSalesEnabled(config){return liveDomainProcessingEnabled(config)&&config?.liveDomainSales===true;}
