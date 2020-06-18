/**
 *  Copyright (c) 2019, The OpenThread Authors.
 *  All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  const router = app.route('/size-report')
  const path = require('path')
  const render = require('ejs').compile(`
<%
function sign(n) {
  return n > 0 ? ('+' + n) : n;
}
%>
# Size Report of **<%= name %>**
> Merging [#<%= number %>](https://github.com/<%= owner %>/<%= repo %>/commit/<%= commit_id %>) into [<%= base_branch %>](https://github.com/<%= owner %>/<%= repo %>/commit/<%= base_commit_id %>)(<%= base_commit_id %>).

|  name  |  branch  |  text  | data  | bss  | total |
| :----: | :------: | -----: | ----: | ---: | ----: |
<% data.forEach(function(diff) { if (diff.type == 'size') { -%>
| <%= diff.name %> | <%= base_branch %> | <%=diff.base[0] %> | <%= diff.base[1] %> | <%= diff.base[2] %> | <%= diff.base[3] %> |
|  | #<%= number %> | <%= diff.pr[0] %> | <%= diff.pr[1] %> | <%= diff.pr[2] %> | <%= diff.pr[3] %> |
|  | +/- | <%= sign(diff.pr[0] - diff.base[0]) %> | <%= sign(diff.pr[1] - diff.base[1]) %> | <%= sign(diff.pr[2] - diff.base[2]) %> | <%= sign(diff.pr[3] - diff.base[3]) %> |
<% }}) -%>
`)

  // Use any middleware
  router.use(require('express').json())

  router.get('/:installationId/bash', async (req, res) => {
    res.sendFile('bash', {
      root: path.join(__dirname, 'public')
    })
  })

  router.post('/:installationId/review', async (req, res) => {
    const github = await app.auth(req.params.installationId)
    let response = await github.issues.listComments({
      number: req.body.number,
      owner: req.body.owner,
      repo: req.body.repo
    })

    const params = {
      number: req.body.number,
      owner: req.body.owner,
      repo: req.body.repo,
      body: render(req.body)
    }

    const comment = response.data.find(review => review.user.login === 'size-report[bot]')

    if (comment) {
      params.comment_id = comment.id
      response = await github.issues.updateComment(params)
    } else {
      response = await github.issues.createComment(params)
    }

    return res.sendStatus(response.status)
  })
}
