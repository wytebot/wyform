import formsHandler from '../lib/api/forms.js';
import publicFormsHandler from '../lib/api/forms-public.js';
import submissionHandler from '../lib/api/form-submission.js';
import statsHandler from '../lib/api/form-stats.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || 'forms');
  if (route === 'forms-public') return publicFormsHandler(req, res);
  if (route === 'form-submission') return submissionHandler(req, res);
  if (route === 'form-stats') return statsHandler(req, res);
  return formsHandler(req, res);
}
