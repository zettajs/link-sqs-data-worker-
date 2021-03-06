// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#! /usr/bin/env node

var program = require('commander');
var ReceiveSqs = require('./lib/recv-sqs');

program
  .version('0.0.0')
  .option('-r, --region [region]', 'AWS Region', 'us-east-1')
  .option('-l, --limit [number]', 'Limit the number of message processed to a fixed number')
  .parse(process.argv);

var maps = {
  device: function(msg) {
    msg.tenant = msg.tags['req-header-x-apigee-iot-tenant-id'] || 'default';
    return msg;
  },
  usage: function(msg) {
    if (msg.hasOwnProperty('headers')) {
      msg.tenant = msg.headers['x-apigee-iot-tenant-id'] || 'default';
      ['connection', 'sec-websocket-version', 'upgrade', 'sec-websocket-key', 'authorization', 'host'].forEach(function(k) {
        delete msg.headers[k];
      });
      
    } else {
      msg.tenant = 'default';
    }
    
    msg.timestamp = msg.upload;
    delete msg.upload;
    return msg;
  }
};

var Type = program.args[0];
if (!Type || Object.keys(maps).indexOf(Type) < 0) {
  console.error('Provide queue url');
  program.help();
  process.exit(1);
}

var QueueUrl = program.args[1];
if (!QueueUrl) {
  console.error('Provide queue url');
  program.help();
  process.exit(1);
}

var Bucket = program.args[2];
if (!Bucket) {
  console.error('Bucket queue url');
  program.help();
  process.exit(1);
}

ReceiveSqs({ awsConfig: { region: program.region } })
  .from(QueueUrl)
  .to(Bucket)
  .limit(program.limit)
  .map(maps[Type])
  .finish(function(err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });

