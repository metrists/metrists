export function getRequestUrl(host: string | URL , route?: string){
    const hostString = typeof host === 'string' ? host : host.toString();
    const hostStringWithSchema = addSchemaToHost(hostString);
    
    const url = new URL(route ?? '', hostStringWithSchema);

  return url.toString();
}

function addSchemaToHost(host: string){
    if(host.startsWith('http://') || host.startsWith('https://')){
        return host;
    }
    return `https://${host}`;
}