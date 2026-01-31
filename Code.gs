
/**
 * TaskPro - BizSkill Automation Backend
 * Google Sheets Integration Script
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

function testWhatsAppConnection() {
  const config = getMASConfig();
  const testMsg = "🔍 *TaskPro Connection Test*\nTesting WhatsApp API configuration.";
  
  Logger.log("Starting Manual Test...");
  Logger.log(`Using Username: ${config.username}`);
  if (config.defaultGroup) {
    Logger.log(`Attempting to send to Group: ${config.defaultGroup}`);
    const mobileNumber = "9864023964";
    sendpersonalMessage(testMsg, mobileNumber, config.username, config.password);
    sendgroupMessage(testMsg, config.defaultGroup, config.username, config.password);
  } else {
    Logger.log("No default group ID found in AppSettings.");
  }
}

function testTelegramConnection() {
  const config = getTelegramConfig();
  if (!config.botToken) {
    Logger.log("❌ No Telegram bot token found in AppSettings");
    return;
  }
  Logger.log("✅ Telegram bot token configured: " + config.botToken.substring(0, 10) + "...");
}

function sheetToJSON(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd-MM-yyyy");
      }
      let key = (h === 'ID' || h === 'id') ? 'id' : h.charAt(0).toLowerCase() + h.slice(1);
      obj[key] = val;
    });
    return obj;
  });
}

function escapeMarkdown(text) {
  if (!text) return "";
  return text.toString()
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/`/g, '\\`');
}

function getUserRole(userName) {
  if (!userName) return null;
  try {
    const users = sheetToJSON('Users');
    const user = users.find(u => u.name && u.name.toString().trim().toLowerCase() === userName.trim().toLowerCase());
    return user ? user.role : null;
  } catch (e) {
    return null;
  }
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    let result;
    if (action === 'init') {
      result = {
        mainTasks: sheetToJSON('MainTasks'),
        vendorTasks: sheetToJSON('VendorTasks'),
        users: sheetToJSON('Users'),
        projects: sheetToJSON('Projects'),
        clients: sheetToJSON('Clients'),
        vendors: sheetToJSON('Vendors'),
        categories: sheetToJSON('Categories'),
        vendorCategories: sheetToJSON('VendorCategories'),
        designations: sheetToJSON('Designations'),
        actionLogs: [...sheetToJSON('MainTaskActionLog'), ...sheetToJSON('VendorTaskActionLog')],
        recurringTasks: sheetToJSON('RecurringTasks'),
        recurringActions: sheetToJSON('RecurringActions'),
        settings: sheetToJSON('AppSettings')[0] || {}
      };
    } else {
      result = sheetToJSON(action);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const payload = params.data;
  
  try {
    let result;
    switch (action) {
      case 'addTask': 
        result = handleAddTask(payload); 
        break;
      case 'updateTask': 
        result = handleUpdateTask(payload); 
        break;
      case 'addMaster': 
        result = handleAddMaster(params.target, payload); 
        if (params.target === 'RecurringTasks') {
           handleRecurringTaskNotification(payload, true);
        }
        if (params.target === 'RecurringActions') {
           handleRecurringTaskNotification(payload, false);
        }
        break;
      case 'updateMaster': 
        result = handleUpdateMaster(params.target, payload); 
        break;
      case 'deleteRecord': 
        result = handleDeleteRecord(params.target, payload.id); 
        break;
      default: 
        throw new Error("Invalid action: " + action);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAddTask(data) {
  const isVendor = !!(data.vendor && data.vendor.trim() !== '');
  const sheetName = isVendor ? 'VendorTasks' : 'MainTasks';
  const sheet = SS.getSheetByName(sheetName);
  const id = new Date().getTime();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const normalizedData = {};
  Object.keys(data).forEach(k => { normalizedData[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = data[k]; });

  const rowData = headers.map(h => {
    const hLower = h.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (hLower === 'id') return id;
    if (hLower === 'date') return new Date();
    if (hLower === 'status') return 'Not Yet Started';
    if (hLower === 'lastupdatedate') return new Date();
    if (hLower === 'vendorcategory') return data.vendorCategory || "";
    if (hLower === 'clientname') return data.clientName || "";
    if (hLower === 'project') return data.project || "";
    if (hLower === 'duedate') return data.dueDate || "";
    if (hLower === 'lastupdateremarks') return data.remarks || "";
    if (hLower === 'hours') return data.hours || 0;
    if (normalizedData[hLower] !== undefined) return normalizedData[hLower];
    return "";
  });
  
  sheet.appendRow(rowData);

  // Notification Logic
  try {
    const owner = data.owner || '-';
    const ownerRole = getUserRole(data.owner);
    const assignees = (data.assignees || '').toString().trim();
    const vendor = (data.vendor || '').toString().trim();
    
    // Check for self-assignment + Admin role
    const isSelfAssignment = isVendor 
      ? (vendor === owner.trim())
      : (assignees === owner.trim());
    
    const skipAllNotifications = isSelfAssignment && ownerRole === 'Admin';

    if (!skipAllNotifications) {
      const config = getMASConfig();
      const creationTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy hh:mm a");
      const client = data.clientName || '-';
      const project = data.project || '-';
      const taskTitle = data.title || data.task;

      let msg;
      if (isVendor) {
        msg = `*New Vendor Task*\n\n` +
              `*Task:* ${escapeMarkdown(taskTitle)}\n` +
              `*Owner:* ${escapeMarkdown(owner)}\n` +
              `*Vendor:* ${escapeMarkdown(data.vendor)}\n` +
              `*Project:* ${escapeMarkdown(project)}\n` +
              `*Client:* ${escapeMarkdown(client)}\n` +
              `*Due Date:* ${formatDateDMY(data.dueDate)}\n` +
              `*Created At:* ${creationTime}`;
      } else {
        msg = `*New Task Assigned*\n\n` +
              `*Task:* ${escapeMarkdown(taskTitle)}\n` +
              `*Owner:* ${escapeMarkdown(owner)}\n` +
              `*Client:* ${escapeMarkdown(client)}\n` +
              `*Project:* ${escapeMarkdown(project)}\n` +
              `*Due Date:* ${formatDateDMY(data.dueDate)}\n` +
              `*Assignees:* ${escapeMarkdown(data.assignees || 'Not assigned')}\n` +
              `*Created At:* ${creationTime}`;
      }

      // Send Personal WhatsApp
      if (isVendor && data.vendor) {
        const vendorMobile = getVendorMobile(data.vendor);
        if (vendorMobile) sendpersonalMessage(msg, vendorMobile, config.username, config.password);
      } else if (data.assignees) {
        data.assignees.split(',').forEach(name => {
          const mobile = getUserMobile(name.trim());
          if (mobile) sendpersonalMessage(msg, mobile, config.username, config.password);
        });
      }

      // Send to Project Groups
      const rawProjectName = project.trim();
      if (rawProjectName && rawProjectName !== '-') {
        sendToProjectWhatsAppGroup(rawProjectName, msg);
        sendToProjectTelegramGroup(rawProjectName, msg);
      }
    }
  } catch (e) { Logger.log("Notification Error: " + e.message); }

  return { id: id };
}

function handleUpdateTask(data) {
  const isVendor = !!(data.vendor && data.vendor.trim() !== '');
  const sheetName = isVendor ? 'VendorTasks' : 'MainTasks';
  const logSheetName = isVendor ? 'VendorTaskActionLog' : 'MainTaskActionLog';
  const sheet = SS.getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == data.id) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) throw new Error("Task ID not found");
  
  const normalizedData = {};
  Object.keys(data).forEach(k => { normalizedData[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = data[k]; });

  headers.forEach((h, i) => {
    const hLower = h.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (hLower === 'id' || hLower === 'date' || hLower === 'hours') return; // Skip hours in initial direct header-match loop
    
    if (hLower === 'lastupdatedate') { 
        if (!normalizedData.skiptimestamp) {
            sheet.getRange(rowIndex, i + 1).setValue(new Date()); 
        }
        return; 
    }
    
    if (hLower === 'lastupdateremarks' && data.lastUpdateRemarks !== undefined) { 
        if (!normalizedData.skiptimestamp) {
            sheet.getRange(rowIndex, i + 1).setValue(data.lastUpdateRemarks); 
        }
        return; 
    }

    if (hLower === 'vendorcategory' && data.vendorCategory !== undefined) { sheet.getRange(rowIndex, i + 1).setValue(data.vendorCategory); return; }
    
    if (normalizedData[hLower] !== undefined) { sheet.getRange(rowIndex, i + 1).setValue(normalizedData[hLower]); }
  });
  
  // Hours logic
  let newHoursLogged = Number(data.hours || 0);

  if (!data.skipLog) {
    const logSheet = SS.getSheetByName(logSheetName);
    const logHeaders = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy hh:mm a");
    
    const logRow = logHeaders.map(h => {
      const hLower = h.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (hLower === 'id') return new Date().getTime();
      if (hLower === 'taskid') return data.id;
      if (hLower === 'updatedate') return timestamp;
      if (hLower === 'remarks') return data.lastUpdateRemarks || data.remarks || "-";
      if (hLower === 'tasktitle') return data.title || data.task || "";
      if (hLower === 'taskdate') return data.date || "";
      if (hLower === 'hours') return newHoursLogged;

      if (normalizedData[hLower] !== undefined) return normalizedData[hLower];
      return "";
    });
    logSheet.appendRow(logRow);

    // Summing hours from log back to MainTasks
    try {
        const logData = logSheet.getDataRange().getValues();
        const logH = logData[0].map(h => h.toString().toLowerCase().replace(/[^a-z0-9]/g, ''));
        const taskIdCol = logH.indexOf('taskid');
        const hoursCol = logH.indexOf('hours');

        if (taskIdCol !== -1 && hoursCol !== -1) {
            let totalSum = 0;
            for (let r = 1; r < logData.length; r++) {
                if (logData[r][taskIdCol] == data.id) {
                    totalSum += Number(logData[r][hoursCol] || 0);
                }
            }
            
            const mainH = headers.map(h => h.toString().toLowerCase().replace(/[^a-z0-9]/g, ''));
            const mainHoursColIndex = mainH.indexOf('hours');
            if (mainHoursColIndex !== -1) {
                sheet.getRange(rowIndex, mainHoursColIndex + 1).setValue(totalSum);
            }
        }
    } catch (e) { Logger.log("Hours Sum Calculation Error: " + e.message); }

    // Update Notification
    try {
      const owner = data.owner || '-';
      const ownerRole = getUserRole(data.owner);
      const assignees = (data.assignees || '').toString().trim();
      const vendor = (data.vendor || '').toString().trim();
      
      const isSelfAssignment = isVendor 
        ? (vendor === owner.trim())
        : (assignees === owner.trim());
      
      const skipAllNotifications = isSelfAssignment && ownerRole === 'Admin';

      if (!skipAllNotifications) {
        const config = getMASConfig();
        const client = data.clientName || '-';
        const project = data.project || '-';

        let updateMsg;
        if (isVendor) {
          updateMsg = `📝 *Vendor Task Updated*\n\n` +
                      `*Task:* ${escapeMarkdown(data.title || data.task)}\n` +
                      `*Owner:* ${escapeMarkdown(owner)}\n` +
                      `*Vendor:* ${escapeMarkdown(data.vendor || '-')}\n` +
                      `*Project:* ${escapeMarkdown(project)}\n` +
                      `*Client:* ${escapeMarkdown(client)}\n` +
                      `*Status:* ${data.status}\n` +
                      `*Minit Logged:* ${newHoursLogged}\n` +
                      `*Remarks:* ${escapeMarkdown(data.lastUpdateRemarks || '-')}\n` +
                      `*Updated At:* ${timestamp}`;
        } else {
          updateMsg = `📝 *Task Updated*\n\n` +
                      `*Task:* ${escapeMarkdown(data.title || data.task)}\n` +
                      `*Owner:* ${escapeMarkdown(owner)}\n` +
                      `*Assignees:* ${escapeMarkdown(data.assignees || '-')}\n` +
                      `*Project:* ${escapeMarkdown(project)}\n` +
                      `*Client:* ${escapeMarkdown(client)}\n` +
                      `*Status:* ${data.status}\n` +
                      `*Minit Logged:* ${newHoursLogged}\n` +
                      `*Remarks:* ${escapeMarkdown(data.lastUpdateRemarks || '-')}\n` +
                      `*Updated At:* ${timestamp}`;
        }
        
        if (data.owner) {
          const ownerMobile = getUserMobile(data.owner);
          if (ownerMobile) sendpersonalMessage(updateMsg, ownerMobile, config.username, config.password);
        }
        if (data.project) {
          sendToProjectWhatsAppGroup(data.project, updateMsg);
          sendToProjectTelegramGroup(data.project, updateMsg);
        }
      }
    } catch (e) { Logger.log("Update Notification Error: " + e.message); }
  }
  return true;
}

function handleAddMaster(target, data) {
  const sheet = SS.getSheetByName(target);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const id = new Date().getTime();
  const normalizedData = {};
  Object.keys(data).forEach(k => { normalizedData[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = data[k]; });

  const rowData = headers.map(h => {
    const hLower = h.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (hLower === 'id') return id;
    if (hLower === 'isactive') return true;
    if (normalizedData[hLower] !== undefined) return normalizedData[hLower];
    return "";
  });
  sheet.appendRow(rowData);
  return { id: id };
}

function handleUpdateMaster(target, data) {
  const sheet = SS.getSheetByName(target);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == data.id) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) throw new Error("Record ID not found");
  headers.forEach((h, i) => {
    let key = h.charAt(0).toLowerCase() + h.slice(1);
    if (data[key] !== undefined) { sheet.getRange(rowIndex, i + 1).setValue(data[key]); }
  });
  return true;
}

function handleDeleteRecord(target, id) {
  const sheet = SS.getSheetByName(target);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == id) { sheet.deleteRow(i + 1); return true; }
  }
  return false;
}

function formatDateDMY(dateValue) {
  if (!dateValue) return "";
  let date = (dateValue instanceof Date) ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return String(dateValue);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function getVendorMobile(vendorName) {
  const vendors = sheetToJSON('Vendors');
  const vendor = vendors.find(v => v.name && v.name.toString().trim().toLowerCase() === vendorName.trim().toLowerCase());
  return vendor ? String(vendor.mobile).replace(/\D/g, '').slice(-10) : null;
}

function getUserMobile(userName) {
  const users = sheetToJSON('Users');
  const user = users.find(u => u.name && u.name.toString().trim().toLowerCase() === userName.trim().toLowerCase());
  return user ? String(user.mobile).replace(/\D/g, '').slice(-10) : null;
}

function getProjectWhatsAppGroup(projectName) {
  const projects = sheetToJSON('Projects');
  const project = projects.find(p => p.name && p.name.toString().trim().toLowerCase() === projectName.trim().toLowerCase());
  return project ? (project.whatsAppGroupID || project.whatsappGroupId || '') : '';
}

function getProjectTelegramGroup(projectName) {
  const projects = sheetToJSON('Projects');
  const project = projects.find(p => p.name && p.name.toString().trim().toLowerCase() === projectName.trim().toLowerCase());
  return project ? (project.telegramGroupID || project.telegramGroupId || '') : '';
}

function sendToProjectWhatsAppGroup(projectName, message) {
  const config = getMASConfig();
  const groupId = getProjectWhatsAppGroup(projectName);
  if (groupId) sendgroupMessage(message, groupId, config.username, config.password);
}

function sendToProjectTelegramGroup(projectName, message) {
  const config = getTelegramConfig();
  const groupId = getProjectTelegramGroup(projectName);
  if (config.botToken && groupId) sendTelegramMessage(groupId, message, config.botToken);
}

function getTelegramConfig() {
  const settings = sheetToJSON('AppSettings')[0] || {};
  return { botToken: settings.officeTokenId || "", chatId: settings.officeTelegramGroupId || "" };
}

function getMASConfig() {
  const settings = sheetToJSON('AppSettings')[0] || {};
  return { username: settings.masId || "", password: settings.masPassword || "", defaultGroup: settings.whatsappGroupId || "" };
}

function sendTelegramMessage(chatId, text, botToken) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
  const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      Logger.log("Telegram Error: " + response.getContentText());
    }
  } catch (e) { Logger.log("Telegram Fetch Error: " + e.message); }
}

function sendpersonalMessage(waMessage, mobileNumber, username, password) {
  const url = "https://app.messageautosender.com/api/v1/message/create";
  const payload = { "receiverMobileNo": mobileNumber, "message": [waMessage.toString()] };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'headers': { 'Authorization': 'Basic ' + Utilities.base64Encode(username + ":" + password) },
    'muteHttpExceptions': true
  };
  try { UrlFetchApp.fetch(url, options); } catch (e) { Logger.log(e); }
}

function sendgroupMessage(waMessage, groupId, username, password) {
  const url = "https://app.messageautosender.com/api/v1/message/create-group-message";
  const payload = { "groupInviteCode": groupId, "message": [waMessage.toString()] };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'headers': { 'Authorization': 'Basic ' + Utilities.base64Encode(username + ":" + password) },
    'muteHttpExceptions': true
  };
  try { UrlFetchApp.fetch(url, options); } catch (e) { Logger.log(e); }
}

function handleRecurringTaskNotification(data, isNew) {
  try {
    const config = getMASConfig();
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy hh:mm a");
    const taskTitle = data.title || data.taskTitle;
    const assignee = data.assignee;
    
    // Construct Rule Detail based on periodicity
    let ruleDetail = `*Periodicity:* ${data.periodicity || 'Fixed Days'}`;
    if (data.periodicity === 'Weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      ruleDetail += `\n*Day of Week:* ${days[data.recurrenceDay] || data.recurrenceDay}`;
    } else if (data.periodicity === 'Monthly') {
      ruleDetail += `\n*Day of Month:* ${data.recurrenceDay}`;
    } else if (data.periodicity === 'Yearly') {
      ruleDetail += `\n*Month:* ${data.recurrenceMonth}\n*Day:* ${data.recurrenceDay}`;
    } else { // 'Fixed Days' or Default
      ruleDetail += `\n*Frequency:* Every ${data.frequencyDays || 30} days`;
    }

    let msg;
    if (isNew) {
      msg = `🔄 *New Recurring Task Created*\n\n` +
            `*Task:* ${escapeMarkdown(taskTitle)}\n` +
            `*Category:* ${data.category}\n` +
            `*Assignee:* ${escapeMarkdown(assignee)}\n` +
            `*Start Date:* ${formatDateDMY(data.startDate)}\n` +
            `${ruleDetail}\n` +
            `*Created At:* ${timestamp}`;
    } else {
      msg = `✅ *Recurring Task Updated*\n\n` +
            `*Task:* ${escapeMarkdown(taskTitle)}\n` +
            `*Assignee:* ${escapeMarkdown(assignee)}\n` +
            `*Status:* ${data.status}\n` +
            `${ruleDetail}\n` +
            `*Remarks:* ${escapeMarkdown(data.remarks || data.lastUpdateRemarks || '-')}\n` +
            `*Updated At:* ${timestamp}`;
    }

    // Personal WhatsApp to Assignee
    if (assignee) {
      const mobile = getUserMobile(assignee.trim());
      if (mobile) sendpersonalMessage(msg, mobile, config.username, config.password);
    }

    // Telegram Group notification from AppSettings (Column C)
    const telegramConfig = getTelegramConfig();
    if (telegramConfig.botToken && telegramConfig.chatId) {
      sendTelegramMessage(telegramConfig.chatId, msg, telegramConfig.botToken);
    }
    
  } catch (e) { Logger.log("Recurring Notification Error: " + e.message); }
}
