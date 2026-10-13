export function liveDomainNotificationsEnabled(config){return config?.testMode===false&&config?.liveDomainNotifications===true;}
export function liveDomainProcessingEnabled(config){return config?.testMode===false&&config?.liveDomainProcessing===true;}
export function liveDomainSalesEnabled(config){return liveDomainNotificationsEnabled(config)&&liveDomainProcessingEnabled(config)&&config?.liveDomainSales===true;}
