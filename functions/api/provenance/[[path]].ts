import {
  handleProvenanceGateway,
  type ProvenanceGatewayEnv,
} from '../../../lib/provenance-gateway';

interface FunctionContext {
  env: ProvenanceGatewayEnv;
  params: { path?: string | string[] };
  request: Request;
}

export function onRequest(context: FunctionContext) {
  const rawPath = context.params.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath || '';
  return handleProvenanceGateway({
    request: context.request,
    path,
    env: context.env,
  });
}
