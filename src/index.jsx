// 2022/09/11 - IPD-0 - Yong - Part 2: Call a Jira API
import api, { route } from "@forge/api";
// 2022/09/11 - IPD-0 - Yong - Use the UI kit hook useProductContext to get the issueId to call fetchCommentsForIssue
import ForgeUI, { render, Fragment, Text, IssuePanel, useProductContext, useState } from "@forge/ui";

// 2022/09/11 - IPD-0 - Yong - create a function that calls the Jira REST API by using the @forge/api package
const fetchCommentsForIssue = async(issueIdOrKey) => {
  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueIdOrKey}/comment`);
    
  const data = await res.json();
  return data.comments;
};

// 2022/09/11 - IPD-0 - Yong - 获取Issue的创建日期与解决日期
const fetchChangelogsForIssue = async(issueIdOrKey) => {

  // See https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-changelog-get
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issueIdOrKey}/changelog`);
  
  const data = await res.json();
  return data.values;
};

const App = () => {
  // 2022/09/11 - IPD-0 - Yong - 
  const context = useProductContext();

  const [comments] = useState(async() => await fetchCommentsForIssue(context.platformContext.issueKey));

  const [changelogs] = useState(async() => await fetchChangelogsForIssue(context.platformContext.issueKey));

  var searchword = 'status'
  let statuschangelogs = []
  var commentoutput = ''
  var changelogcount = 0
  var lateststartdate = '1970-01-01T00:00:00.000+0800'
  var latestresolvedate = '1970-01-01T00:00:00.000+0800'
  var cycletime = 0.0

  // 获取所有变更日志的条数/变更次数
  changelogcount = changelogs.length;

  changelogs.forEach((item) => {
    let res = item['items'].filter((statuschange) => statuschange['fieldId'] == searchword)

    if(res && res.length){

      // 获取状态转换到[In Progress]的最晚日期：
      if(res[0].toString == "In Progress" && new Date(lateststartdate).getTime() < new Date(item.created).getTime()){
          lateststartdate = item.created;

          // 打印日志
          console.log('状态转换到[In Progress]的日期： ' + formatutctime(item.created));
      }
      
      // 获取状态转换到[Done]的最晚日期：
      if(res[0].toString == "Done" && new Date(latestresolvedate).getTime() < new Date(item.created).getTime()){
        latestresolvedate = item.created;

        // 打印日志
        console.log('状态转换到[Done]的日期： ' + formatutctime(item.created));
      }

      item['items'] = res
      statuschangelogs.push(item)

      // 输出状态信息
      commentoutput += " 在 " + formatutctime(item.created) + " 将状态从[" + res[0].fromString + ']变更为[' + res[0].toString + ']  --> ';
    }
  })

  if(lateststartdate == '1970-01-01T00:00:00.000+0800'){
    // 历史没有更新到[In Progress]状态
    cycletime = 0;
  }else if(latestresolvedate == '1970-01-01T00:00:00.000+0800'){
    // 历史没有更新到[Done]状态，则使用当天时间减去最近一次更新到[In Progress]日期，计算Cycle Time
    cycletime = (new Date().getTime() - new Date(lateststartdate).getTime())/1000/60/60/24;
  }else{
    // 当前是[Done]状态，使用最近一次更新到[Done]状态的日期，减去最近一次更新到[In Progress]日期，计算Cycle Time
    cycletime = (new Date(latestresolvedate).getTime() - new Date(lateststartdate).getTime())/1000/60/60/24;
  }

  console.log("历史评论数：" + comments.length);
  console.log("历史变更数：" + changelogs.length);
  console.log("最晚开始日期：" + formatutctime(lateststartdate));
  console.log("最晚结束日期：" + formatutctime(latestresolvedate)); 
  console.log(commentoutput);

  return (
    <Fragment>
      <Text>历史评论数：{comments.length} 个</Text>
      <Text>历史变更数：{changelogcount} 次</Text>
      <Text>状态变更数：{statuschangelogs.length} 次</Text>
      <Text>最晚开始日期：{formatutctime(lateststartdate)}</Text>
      <Text>最晚结束日期：{formatutctime(latestresolvedate)}</Text>
      <Text>Cycle Time：{cycletime.toFixed(1)} 天</Text>
    </Fragment>
  );
};

export const run = render(
  <IssuePanel>
    <App />
  </IssuePanel>
);

// UTC encoded format
function formatutctime(utc_datetime) {
    // 转为正常的时间格式 年-月-日 时:分:秒
    let T_pos = utc_datetime.indexOf('T');
    let Z_pos = utc_datetime.indexOf('.');
    let year_month_day = utc_datetime.substr(0,T_pos);
    let hour_minute_second = utc_datetime.substr(T_pos+1,Z_pos-T_pos-1);
    let new_datetime = year_month_day + " " + hour_minute_second; // 2017-03-31 08:02:06

    return new_datetime;
} 