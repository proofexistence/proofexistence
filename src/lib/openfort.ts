import Openfort from '@openfort/openfort-node';

if (!process.env.OPENFORT_SECRET_KEY) {
  throw new Error('Missing OPENFORT_SECRET_KEY');
}

export const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY);
