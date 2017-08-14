#!/usr/bin/env node

process.env.TEMPLATE = process.argv[2];
process.argv.splice(2, 1);
require('./index')();
