import deliveryHandler from '../lib/api/process-delivery-jobs.js';
import maintenanceHandler from '../lib/api/maintenance.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || 'process-delivery-jobs');
  if (route === 'maintenance') return maintenanceHandler(req, res);
  return deliveryHandler(req, res);
}
