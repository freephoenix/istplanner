"use strict"
window.onload=async ()=>{
const TIME_ZONE_OFFSET=new Date().getTimezoneOffset()*60000,
      machines=['1А516МФ3', 'CAK-4085#1', '560 DUS#1', '560 DUS#2', '560 DUS#3', '560 DUS#4', '800 DUS#1', '800 DUS#2', 'SOLEX NL502SC', 'HAAS VF6#1', 'HAAS VF6#2', 'Малый фрезерный', '6ДМ83ШФ3', 'Координатный', '1М63', 'ТС-75', 'фрезерный', 'HAAS ST-40', 'HAAS TL-3B', 'Швейная машинка', 'DMTG CDS6266B', 'CAK-4085#2', 'Эррозия', 'Гидрорез'],
      // список задач
      tasks=(localStorage.tasks) ? JSON.parse(localStorage.tasks) : {},
      tasksInQueue=(localStorage.tasksInQueue) ? JSON.parse(localStorage.tasksInQueue) : [],
      createdTasks=(localStorage.createdTasks) ? JSON.parse(localStorage.createdTasks) : [],
      IDsOfDeletedTasks=(localStorage.IDsOfDeletedTasks!=='' && localStorage.IDsOfDeletedTasks!==undefined) ? JSON.parse(localStorage.IDsOfDeletedTasks) : [],
      createdTasksInQueue=(localStorage.createdTasksInQueue) ? JSON.parse(localStorage.createdTasksInQueue) : [],
      IDsOfDeletedTasksInQueue=(localStorage.IDsOfDeletedTasksInQueue!=='' && localStorage.IDsOfDeletedTasksInQueue!==undefined) ? JSON.parse(localStorage.IDsOfDeletedTasksInQueue) : [],
      machinesTasks=document.querySelector('#machinesTasks'),
      header=document.querySelector('#header'),
      settingsButton=document.querySelector('#settingsButton'),
      canvasHeader=document.querySelector('#gridHeader'),
      canvas=document.querySelector('#grid'),
      deadlineGradient=document.querySelector('#deadlineGradient'),
      taskMenu=document.querySelector('#taskMenu'),
      tasksQueue=document.querySelector('#tasksQueue'),
      fillerDiv=document.querySelector('#fillerDiv'),
      toggleMagnet=document.querySelector('#toggleMagnet'),
      editTask=document.querySelector('#editTask'),
      removeTask=document.querySelector('#removeTask'),
      addTask=document.querySelector('#addTask'),
      editTaskMenu=document.querySelector('#editTaskMenu'),
      editTaskMenuInputs=document.querySelectorAll('.editTaskMenuInput'),
      editTaskMenuOks=editTaskMenu.querySelectorAll('.editTaskMenuOk'),
      settingsMenu=document.querySelector('#settingsMenu'),
      periodMenu=document.querySelector('#periodMenu'),
      periodMenuInputs=periodMenu.querySelectorAll('input'),
      hideMachinesTable=document.querySelector('#hideMachines tbody'),
      authorsListTable=document.querySelector('#authorsList tbody'),
      partysListTable=document.querySelector('#partysList tbody'),
      settingsInput=document.querySelectorAll('.settingsInput'),
      setOfIds=new Set(), // нужен для сохранения цвета у задачи в localStorage
      // список отображенных задач (используется для масштабирования)
      displayedTasks=new Set(),
      authors=new Set(),
      partys=new Set(),
      // функция создания ID
      createID=async ()=>{
        let  ID;
        await fetch('/getID')
        .then(res=>res.text()).then(newId=>{
          ID=newID;
        }).catch((e)=>{
          do ID=''+Math.floor(Math.random()*9999999999);
          while(setOfIds.has(ID));
        });
        return ID;
      },
      // функция рисования сетки
      drawGrid=(dayStart, dayEnd)=>{
        const context=canvas.getContext("2d"),
              headerContext=canvasHeader.getContext("2d"),
              days=(dayEnd-dayStart)/86400000+1,
              width=days*1440/canvasScale,
              ml=machines.length,
              mlh=ml*stringHeinght;
        context.clearRect(0, 0, canvas.width, canvas.height);
        headerContext.clearRect(0, 0, canvasHeader.width, canvasHeader.height);
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", mlh);
        canvasHeader.setAttribute("width", width);
        canvasHeader.setAttribute("height", 2*stringHeinght);
        headerContext.fillStyle="White";
        headerContext.fillRect(0, 0, canvasHeader.width, canvasHeader.height);
        headerContext.beginPath();
        context.beginPath();
        // горизонтальные линии
        let h=stringHeinght;
        headerContext.moveTo(0,h);
        headerContext.lineTo(width,h);
        h*=2;
        headerContext.moveTo(0,h);
        headerContext.lineTo(width,h);
        for(let i=ml+1; i--;) {
          const h=stringHeinght*i;
          context.moveTo(0,h);
          context.lineTo(width,h);
        };
        // вертикальные линии
        for(let i=days*24; i--;) {
          let w=60/canvasScale*i;
          if(4<canvasScale && canvasScale<9) w*=2;
          else if(8<canvasScale) w*=4;
          headerContext.moveTo(w,stringHeinght);
          headerContext.lineTo(w,2*stringHeinght);
          context.moveTo(w,0);
          context.lineTo(w,mlh);
          if(i%24===0) {// граница суток
            w=60/canvasScale*i;
            headerContext.moveTo(w,0);
            headerContext.lineTo(w,stringHeinght);
          }
        };
        headerContext.stroke();
        context.stroke();
        // дни
        headerContext.fillStyle="Black";
        headerContext.font="12px sans-serif";
        let w1=headerContext.measureText("00.00.00").width, w2=headerContext.measureText("00").width;
        for(let i=days; i--;) headerContext.fillText(new Date(dayStart.getTime()+86400000*i).toLocaleDateString(), 1440/canvasScale*(i+0.5)-w1/2, 16);
        // часы
        if(canvasScale<5) for(let i=days*24; i--;) headerContext.fillText(String(i%24).padStart(2, "0"), 60/canvasScale*(i+0.5)-w2/2, 38);
        if(4<canvasScale && canvasScale<9) for(let i=days*12; i--;) headerContext.fillText(String(2*i%24).padStart(2, "0"), 120/canvasScale*(i+0.5)-w2/2, 38);
        if(8<canvasScale) for(let i=days*6; i--;) headerContext.fillText(String(4*i%24).padStart(2, "0"), 240/canvasScale*(i+0.5)-w2/2, 38);
      },
      // функция рисования градиента дедлайна
      drawGrad=(dayStart, dayEnd, deadline)=>{
        const contextGradient=deadlineGradient.getContext("2d");
              contextGradient.clearRect(0, 0, deadlineGradient.width, deadlineGradient.height);
              deadlineGradient.width=canvas.width;
              deadlineGradient.height=canvas.height;
        const dealine=new Date(new Date(deadline).getTime()+TIME_ZONE_OFFSET),
              beforeDeadline=(dealine-dayStart)/86400000,
              beforeEndOfPeriod=(dayEnd.getTime()-dayStart+86400000)/86400000;
        // если дедлайн наступит
        if(beforeDeadline>0) {
          const diff=beforeEndOfPeriod-beforeDeadline,
                lengthOfDay=1440/canvasScale,
                startColorFrom=beforeDeadline-3,
                startGradFrom=(startColorFrom>0) ? startColorFrom*lengthOfDay : 0,
                endGradAt=(diff>0) ? beforeDeadline*lengthOfDay : canvas.width,
                linGrad=contextGradient.createLinearGradient(startGradFrom,deadlineGradient.height,endGradAt,deadlineGradient.height);
          let startColor=255, endColor=153;
          if(startColorFrom<0) startColor=255+34*startColorFrom;
          linGrad.addColorStop(0.0, `rgb(${startColor}, ${startColor}, ${startColor})`);
          if(diff<0) endColor=153-34*diff;
          linGrad.addColorStop(1.0, `rgb(${endColor}, ${endColor}, ${endColor})`);
          if(diff>0) linGrad.addColorStop(1.0, "rgb(204, 204, 204)");
          contextGradient.fillStyle=linGrad;
          contextGradient.fillRect(0,0,deadlineGradient.width,deadlineGradient.height);
        // если дедлайн прошел
        } else {
          contextGradient.fillStyle="rgb(204, 204, 204)";
          contextGradient.fillRect(0,0,canvas.width,canvas.height);
        }
      },
      // функция заполнения списка задач
      fillTaskList=(tasks, machine)=>{
        const allTaskLines=document.querySelectorAll('.taskLine');
        const fillTaskListLine=(machine)=>{
          const tasksOfMachine=tasks[machine], pos=machines.indexOf(machine), taskLine=allTaskLines[pos];
          if(pos===-1) delete tasks[machine];
          else {
            taskLine.innerHTML='';
            for(let i=0, end=tasksOfMachine.length; i<end; i++) {
              const cur=tasksOfMachine[i],
                    date=new Date(cur.start);
              if(dayEnd-date<-86220000) continue; // задачи, начинающиеся после 23:57 последнего дня выбранного периода, не отображаются, т.к. задачи меньше 3х минут не отображаются
              let dateWithShift=(date-dayStart)/60000,
                  [hh, mm]=cur.duration.split(':'),
                  duration=(+mm+hh*60)*cur.quantity,
                  rest=dateWithShift+duration,
                  disabled;
              if(rest<0) continue; // если начатая ранее задача, не входит в период
              if(dateWithShift<0) { // если начатая ранее задача, заканчивается в выбранном периоде
                dateWithShift=0
                duration=rest;
                disabled=true;
              }
              // если начатая в выбранном периоде задача заканчивается за пределами периода
              if(date.getTime()+(duration-1440)*60000>new Date(dayEnd).getTime()) {
                duration=(dayEnd-date)/60000+1440; // 1440 - минут в сутках
                disabled=true;
              }
              const div=document.createElement('div');
              displayedTasks.add(div);
              if(cur.quantity>1) {
                div.innerHTML=cur.name+' - '+cur.quantity+' шт.';
                div.title=cur.name+' - '+cur.quantity+' шт.';
              } else {
                div.innerHTML=cur.name;
                div.title=cur.name;
              }
              if(cur.deadline) {
                const dealine=cur.deadline.slice(2,10).split('-')
                div.title+=' до '+dealine[2]+'.'+dealine[1]+'.'+dealine[0];
              }
              div.className='task';
              div.dataset.machine=machine;
              div.dataset.left=dateWithShift;
              div.dataset.width=duration;
              div.dataset.position=i;
              div.dataset.magnet=localStorage[cur.ID+'magnet'] || magnetDefault;
              div.style.left = (dateWithShift/canvasScale+138)+'px';
              div.style.width = (duration/canvasScale-2)+'px';
              if(disabled) div.dataset.uneditableTask=true; // маркер блокировки редактирования задач, которые не полностью в отображаются в выбранном периоде
              if(localStorage[cur.ID+'color']) div.style['background-color']=localStorage[cur.ID+'color'];
              taskLine.appendChild(div);
            }
          }
        };
        if(!machine) {
          for(let machine in tasks) {
            fillTaskListLine(machine);
          }
        } else {
          fillTaskListLine(machine);
        }
      },
      // функция заполнения списка задач в очереди
      fillTasksInQueueList=(tasks)=>{
        const taskLine=tasksQueue.querySelector('.taskLine');
        taskLine.innerHTML='';
        taskLine.dataset.machine='В очереди';
        for(let i=0, end=tasksInQueue.length; i<end; i++) {
          const cur=tasksInQueue[i],
                [hh, mm]=cur.duration.split(':'),
                duration=(+mm+hh*60)*cur.quantity,
                div=document.createElement('div'),
                name=cur.name;
          if(cur.quantity>1) {
            div.innerHTML=name+' - '+cur.quantity+' шт.';
            div.title=name+' - '+cur.quantity+' шт.';
          } else {
            div.innerHTML=name;
            div.title=name;
          }
          div.className='task';
          div.dataset.width=duration;
          div.style.width = (duration/canvasScale-2)+'px';
          taskLine.appendChild(div);
        }  
      },
      // функция удаления задачи
      deleteTask=(lastClicked, nextElementSibling)=>{
        if(lastClicked.parentNode.dataset.machine==='В очереди') {
          const pos=+Array.from(lastClicked.parentNode.querySelectorAll('div')).indexOf(lastClicked);
          IDsOfDeletedTasksInQueue.push(tasksInQueue[pos].ID);
          tasksInQueue.splice(pos, 1);
          lastClicked.remove();
        } else {
          const machine=lastClicked.dataset.machine,
                pos=lastClicked.dataset.position,
                [hh, mm]=tasks[machine][pos].duration.split(':'),
                duration=(+mm+hh*60)*60000*tasks[machine][pos].quantity;
          IDsOfDeletedTasks.push(tasks[machine][pos].ID);
          let cur=lastClicked, prevEnd=new Date(tasks[machine][pos].start).getTime()+duration;
          tasks[machine].splice(lastClicked.dataset.position, 1);
          // сместить оставшиеся элементы, если они примагничены и стоят вплотную
          if(cur) {
            for(let i=pos, end=tasks[machine].length; i<end; i++) {
              if(cur.dataset.magnet==='true' && new Date(tasks[machine][i].start).getTime()===prevEnd) {
                const [hh, mm]=tasks[machine][i].duration.split(':'),
                      prevDuration=(+mm+hh*60)*60000*tasks[machine][i].quantity;
                prevEnd=new Date(tasks[machine][i].start).getTime()+prevDuration;
                tasks[machine][i].start=new Date(new Date(tasks[machine][i].start).getTime()-duration-TIME_ZONE_OFFSET).toISOString().slice(0,16);
                cur=cur.nextElementSibling || nextElementSibling;
              } else {
                break;
              }
            }
          }
        }
        
        displayedTasks.delete(lastClicked);
      },
      // функция смещения оставшихся задач
      shiftRestTasks=(pos, machine)=>{
        const dayEndMilliseconds=dayEnd.getTime()+86400000;
        for(let i=pos+1; i<tasks[machine].length; i++) {
          const machinei_1=tasks[machine][i-1],
                machinei=tasks[machine][i],
                [hha, mma]=machinei_1.duration.split(':'),
                [hhb, mmb]= machinei.duration.split(':'),
                aEnd=new Date(new Date(machinei_1.start).getTime()+(+mma+hha*60)*60000*machinei_1.quantity).getTime(),
                bStart=new Date(machinei.start).getTime(),
                bEnd=new Date(bStart+(+mmb+hhb*60)*60000* machinei.quantity).getTime();
          // если предыдущая задача заканчивается за пределами выбранного периода, то возвращаем false
          if(aEnd>dayEndMilliseconds) {
            alert('Создаваемая задача заканчивается за пределами выбранного периода. Измените период.');
            return false;
          }
          // если предыдущая задача заканчивается позже, чем начинается текущая
          if(aEnd>bStart) {
            // если текущая задача заканчивается за пределами выбранного периода, то возвращаем false
            if(bEnd>dayEndMilliseconds) {
              alert('Создаваемая задача пытается сместить задачу, которая заканчивается за пределами выбранного периода. Измените период.');
              return false;
            }
            // иначе смещаем время начала текущей
            else tasks[machine][i].start=new Date(aEnd-TIME_ZONE_OFFSET).toISOString().slice(0,16);
          } else break;
        }
        return true;
      },
      // функция создания задачи
      createTask=(ID, machine, lastClicked, name, start, duration, quantity, color, deadline, party, author)=>{
        if(new Date(start)<dayStart) {
          alert('Создаваемая задача начинается за пределами выбранного периода. Измените период.');
          return false;
        }
        if(!tasks[machine]) tasks[machine]=[];
        const initialTasksOfMachine=[...tasks[machine]];
        // добавить между задачами
        if(lastClicked.className==='task') {
          const pos=+lastClicked.dataset.position,
                [hh, mm]=tasks[machine][pos].duration.split(':');
          tasks[machine].splice(pos+1, 0, {ID:ID, name:name, start:new Date(new Date(tasks[machine][pos].start).getTime()+(+mm+hh*60)*60000*tasks[machine][pos].quantity-TIME_ZONE_OFFSET).toISOString().slice(0,16), duration:duration, quantity:quantity, deadline:deadline, party:party, author:author});
          // сместить остальные задачи или вернуться к исходному в случае неудачи
          if( !shiftRestTasks(pos+1, machine) ) {
            tasks[machine]=initialTasksOfMachine;
            return false;
          }
        // добавить на пустом месте
        } else {
          const curTask={ID:ID, name:name, start:start, duration:duration, quantity:quantity, deadline:deadline, party:party, author:author};
          // если задач нет
          if(tasks[machine].length===0) {
            tasks[machine].push(curTask);
          // если задачи есть
          } else {
            let startDateTime=new Date(start).getTime(), end=tasks[machine].length, last=true;
            // находим следующую после добавленной задачу
            for(let i=0; i<end; i++) {
              if(new Date(tasks[machine][i].start).getTime()>startDateTime) {
                // если время завершения последней задачи больше времени старта новой
                const previous=tasks[machine][i-1];
                if(previous) {
                  const [hh, mm]=previous.duration.split(':'),
                        previousTaskEnd=new Date(previous.start).getTime()+(+mm+hh*60)*60000*previous.quantity;
                  // то изменить время старта
                  if(new Date(start).getTime()<previousTaskEnd) curTask.start=new Date(previousTaskEnd-TIME_ZONE_OFFSET).toISOString().slice(0,16);
                }
                // вставить задачу
                last=false;
                tasks[machine].splice(i, 0, curTask);
                // сместить остальные задачи или вернуться к исходному в случае неудачи
                if( !shiftRestTasks(i, machine) ) {
                  tasks[machine]=initialTasksOfMachine;
                  return false;
                }
                break;
              }
            }
            // если новая задача добавляется в конце
            if(last) {
              // если время завершения последней задачи больше времени старта новой
              const previous=tasks[machine][end-1],
                    [hh, mm]=curTask.duration.split(':');
              if(previous) {
                const [hh, mm]=previous.duration.split(':'),
                      previousTaskEnd=new Date(previous.start).getTime()+(+mm+hh*60)*60000*previous.quantity;
                // то изменить время старта
                if(new Date(start).getTime()<previousTaskEnd) curTask.start=new Date(previousTaskEnd-TIME_ZONE_OFFSET).toISOString().slice(0,16);
              }
              // если задача заканчиватся за пределами периода
              if(new Date(curTask.start).getTime()+(+mm+hh*60)*60000*curTask.quantity > dayEnd.getTime()+86400000) {
                alert('Создаваемая задача заканчивается за пределами выбранного периода. Измените период.');
                return false;
              }  else tasks[machine].push(curTask);
            }
          }
        }
        if(color) localStorage[ID+'color']=color;
        authors.add(author);
        partys.add(party);
        return true;
      },
      // функция блокировки ID
      blockID=async (ID)=>{
        let result=false;
        await fetch('/blockID', {
          method:'POST',
          body:JSON.stringify({ID:ID}),
          headers: {'Content-Type': 'application/json'}
        }).then(res=>res.json()).then(res=>{
          result=res.granted;
        }).catch((e)=>{
          console.info(e);
        });
        return result;
      },
			// функция разблокировки ID
      unblockID=(ID)=>{
        fetch('/unblockID', {
          method:'POST',
          body:JSON.stringify({ID:ID}),
          headers: {'Content-Type': 'application/json'}
        });
        editableID='';
      },
      // функция отправки на сервер списка задач
      sendTasks=async ()=>{
        await fetch('/sendTasks', {
          method:'POST',
          body:JSON.stringify({IDsOfDeletedTasks:IDsOfDeletedTasks, tasks:tasks, IDsOfDeletedTasksInQueue:IDsOfDeletedTasksInQueue, createdTasksInQueue:createdTasksInQueue}),
          headers: {'Content-Type': 'application/json'}
        }).then(res=>{
          if(res.status===200) {
            IDsOfDeletedTasks.length=0;
            IDsOfDeletedTasksInQueue.length=0;
            createdTasksInQueue.length=0;
            console.log('tasks have been refreshed');
          }
        }).catch((e)=>{
          console.info(e);
          alert('Задачи не отправлены');
        });
      },
      // функция загрузки списка задач
      loadTasks=async (dayStart, dayEnd)=>{
        //перед загрузкой обновляем данные на сервере
        await sendTasks();
        fetch('/loadTasks', {
          method:'PUT',
          body:JSON.stringify({dayStart:new Date(dayStart.getTime()-86400000), dayEnd:new Date(dayEnd.getTime()+86400000)}),
          headers: {'Content-Type': 'application/json'}
        }).then(res=>res.json()).then(TasksFromServer=>{
          for(let machineName of machines) tasks[machineName]=[];
          const {loadedTasks, loadedTasksInQueue}=TasksFromServer;
          for(let loadedTask of loadedTasks) {
            let {ID, name, start, duration, quantity, deadline, party, author}=loadedTask;
            start=new Date(new Date(start).getTime()-TIME_ZONE_OFFSET).toISOString().slice(0,16);
            tasks[loadedTask.machine].push({ID, name, start, duration, quantity, deadline, party, author});
            // добавить в наборы авторов и партии
            authors.add(author);
            partys.add(party);
          }
          tasksInQueue.length=0;
          //удаление повторяющихся ID
          let repetitiveIDs=new Set(), checkedLoadedTasksInQueue=[];
          for(let i=0, l=loadedTasksInQueue.length; i<l; i++) {
            let cur=loadedTasksInQueue[i], curID=cur.ID;
            if(!repetitiveIDs.has(curID)) {
              repetitiveIDs.add(curID);
              checkedLoadedTasksInQueue.push(cur);
            }
          }
          Object.assign(tasksInQueue, loadedTasksInQueue);
          displayedTasks.clear();
          fillTaskList(tasks);
          fillTasksInQueueList(tasksInQueue)
        }).catch((e)=>{
          console.info(e);
          alert('Задачи не загружены');
        });
      }
;// end of const

// заполняем набор используемых ID
for(let i=0, end=machines.length; i<end; i++) {
  const t=tasks[machines[i]];
  if(t) for(let j=t.length; j--; i) {
    setOfIds.add(t[j].ID);
  }
}

// автозагрузчик длительности задачи из базы данных
editTaskMenuInputs[0].onchange=(e)=>{
  fetch('/loadDuration', {
    method:'PUT',
    body:JSON.stringify({name:e.target.value}),
    headers: {'Content-Type': 'application/json'}
  }).then(res=>res.text()).then(duration=>{
    editTaskMenuInputs[2].value=duration;
  }).catch((e)=>{
    console.info(e);
  });
};

// глобальные переменные
let canvasScale=Number(localStorage.canvasScale) || 1,
    dayStart= new Date((localStorage.dayStart) ? JSON.parse(localStorage.dayStart) : Math.floor(new Date().getTime()/86400000)*86400000+TIME_ZONE_OFFSET),
    // dayStart=new Date('2021-07-03T00:00'),
    dayEnd=new Date((localStorage.dayEnd) ? JSON.parse(localStorage.dayEnd) : Math.floor(new Date().getTime()/86400000)*86400000+TIME_ZONE_OFFSET),
    // dayEnd=new Date('2021-07-05T00:00'),
    taskLineWidth=(dayEnd-dayStart+86400000)/60000,
    globalWidth=taskLineWidth+139+'px',
    lastClicked=window,
    lastClickedXPoint=0,  // для получения времени из точки нажатия на таблице
    syncronizationInterval=localStorage.syncronizationInterval || 1,
    syncronizator=setInterval(async ()=>{await loadTasks(dayStart, dayEnd)}, syncronizationInterval*60000),
    backgroundColorDefault=localStorage.backgroundColorDefault || '#04AA6D',
    magnetDefault=localStorage.magnetDefault || false,
    editableID='',
		stringHeinght=22;
taskLineWidth+='px';

// настройки по умолчанию
settingsInput[0].value=syncronizationInterval;
settingsInput[1].value=backgroundColorDefault;
settingsInput[2].checked=magnetDefault;

// отображаем список станков
for(let i=0, end=machines.length; i<end; i++) {
  const name=machines[i],
        div=document.createElement('div'),
        div_name=document.createElement('div'),
        div_taskLine=document.createElement('div');
  div.className='machine';
  div_name.innerHTML=name;
  div_name.className='name';
  div_taskLine.className='taskLine';
  div_taskLine.dataset.machine=name;
  div.appendChild(div_name);
  div.appendChild(div_taskLine);
  machinesTasks.insertBefore(div, tasksQueue);
  // создаем элемент таблицы для скрытия станков
  hideMachinesTable.innerHTML+=`<tr><td>${name}</td><td><input type="checkbox" name="${name}" checked></td></tr>`;
}
let taskLines=document.querySelectorAll('.taskLine');

// делаем сетку
drawGrid(dayStart, dayEnd);
header.style.width=machinesTasks.style.width=globalWidth;
for(let machine of document.querySelectorAll('.machine')) machine.style.width=globalWidth;
for(let taskLine of document.querySelectorAll('.taskLine')) if(taskLine.dataset.machine!=='В очереди') taskLine.style.width=taskLineWidth;

// настройка габаритов
const dimentionSetting=()=>{
  const dw=document.documentElement.scrollWidth,
        dh=document.documentElement.scrollHeight,
        tableHeight=(machines.length+2)*stringHeinght+82, // 82 высота окна очереди
        addition=dh-tableHeight;
  document.querySelector('#tasksQueue .taskLine').style.width=dw-140+'px';
  tasksQueue.style.width=dw+'px';
  // если окно меньше таблицы вместе с очередью вставить пустоту внизу, чтобы очередь не перекрыала таблицу
  if(addition<0) {
    document.querySelector('#tasksQueue .name').style.height='77.5px';
    document.querySelector('#tasksQueue .taskLine').style.height=fillerDiv.style.height='82px';
  // иначе увеличить место под очередь
  } else {
    document.querySelector('#tasksQueue .name').style.height=77.5+addition+'px';
    document.querySelector('#tasksQueue .taskLine').style.height=82+addition+'px';
  }
}
dimentionSetting();
window.onresize=(e)=>dimentionSetting();

// отображаем список задач
await loadTasks(dayStart, dayEnd);

// отображаем список задач в очереди
fillTasksInQueueList(tasksInQueue)

// масштабирование таблицы
machinesTasks.addEventListener('mousewheel', (e)=>{
  e.preventDefault();
  canvasScale+=e.wheelDelta/120;
  if(canvasScale<1) canvasScale=1;
  else if(canvasScale>13) canvasScale=13;
  else {
    drawGrid(dayStart, dayEnd);
    for(let displayedTask of displayedTasks.values()) {
      displayedTask.style.left = (displayedTask.dataset.left/canvasScale+138)+'px';
      displayedTask.style.width = (displayedTask.dataset.width/canvasScale-2)+'px';
    }
    for(let displayedTask of tasksQueue.lastElementChild.querySelectorAll('*')) {
      displayedTask.style.left = (displayedTask.dataset.left/canvasScale+138)+'px';
      displayedTask.style.width = (displayedTask.dataset.width/canvasScale-2)+'px';
    }
  }
}, false);

// нажатие на таблице
machinesTasks.addEventListener('mousedown', (e)=>{
  let clicked=false;
  const clickImitator=(e)=>{
    clicked=true;
    machinesTasks.removeEventListener('mouseup', clickImitator, false);
    // обработка событий click на таблице
    const targetClassName=e.target.className;
    if((targetClassName==='task' || targetClassName==='taskLine')  && !e.target.dataset.uneditableTask) {
      lastClicked=e.target;
      taskMenu.style.visibility='visible';
      let x=e.clientX-5, y=e.clientY-5, w=document.documentElement.clientWidth-taskMenu.offsetWidth, h=document.documentElement.clientHeight-taskMenu.offsetHeight;
      lastClickedXPoint=e.pageX;
      if(x>w) x=w;
      if(y>h) y=h;
      taskMenu.style.left=x+'px';
      taskMenu.style.top=y+'px';
      // нажатие на задаче
      if(targetClassName==='task') {
        editTask.style.display='block';
        removeTask.style.display='block';
        // В очереди
        if(e.target.parentNode.dataset.machine==='В очереди') {
          toggleMagnet.parentNode.style.display='none';
          if(toggleMagnet.classList.contains('firstChild')) toggleMagnet.parentNode.classList.remove('firstChild');
          if(!editTask.classList.contains('firstChild')) editTask.classList.add('firstChild');
        // В тасклисте
        } else {
          toggleMagnet.checked=(lastClicked.dataset.magnet==='true');
          toggleMagnet.parentNode.style.display='block';
          if(editTask.classList.contains('firstChild')) editTask.classList.remove('firstChild');
          if(!toggleMagnet.classList.contains('firstChild')) toggleMagnet.parentNode.classList.add('firstChild');
        }
      // нажатие на пустом месте
      } else {
        toggleMagnet.parentNode.style.display='none';
        editTask.style.display='none';
        removeTask.style.display='none';
        if(editTask.classList.contains('firstChild')) editTask.classList.remove('firstChild');
        if(toggleMagnet.classList.contains('firstChild')) toggleMagnet.parentNode.classList.remove('firstChild');
      }
    }    
  }
  machinesTasks.addEventListener('mouseup', clickImitator, false);
  setTimeout(()=>{
    // обработка зажатой клавиши мыши - перетаскивание элементов таблицы
    if(!clicked) {
      const target=e.target;
      if(target.className==='task' && !target.dataset.uneditableTask) {
        const initParentNode=target.parentNode,
              initNextElementSibling=target.nextElementSibling,
              initRect=target.getBoundingClientRect(),
              initLeft=target.style.left,
              initTop=target.style.top,
              taskInQueuePosition=Array.from(initParentNode.querySelectorAll('div')).indexOf(target);
              
        // функция перетаскивания задачи
        function handleDragStart(e) {
          const dragSrcEl = target,
                shiftX = e.clientX - dragSrcEl.getBoundingClientRect().left,
                shiftY = e.clientY - dragSrcEl.getBoundingClientRect().top,
                deadline=(dragSrcEl.dataset.machine) ? tasks[dragSrcEl.dataset.machine][dragSrcEl.dataset.position].deadline : tasksInQueue[taskInQueuePosition].deadline;

          if(deadline) drawGrad(dayStart, dayEnd, deadline); // назначить градиент дедлайна
          dragSrcEl.initOffsetLeft = dragSrcEl.offsetLeft;
          dragSrcEl.initOffsetTop = dragSrcEl.offsetTop;
          dragSrcEl.style['z-index']=4;  // поднять элемент на слой выше, чем "в очереди", но ниже, чем окна
          dragSrcEl.ondragstart = function() {return false;};
          document.body.append(dragSrcEl);

          moveAt(e.pageX, e.pageY);

          function moveAt(pageX, pageY) {
            dragSrcEl.style.left = pageX - shiftX + 'px';
            dragSrcEl.style.top = pageY - shiftY + 'px'; // 44 - это в CSS отступ #machinesTasks {position:absolute; top:44px;}
          }

          let currentDroppable = null;

          function onMouseMove(e) {
            moveAt(e.pageX, e.pageY);

            dragSrcEl.hidden = true;
            let elemBelow = document.elementFromPoint(e.clientX, e.clientY);
            dragSrcEl.hidden = false;

            if(!elemBelow) return;
            let droppableBelow = elemBelow.closest('.subcontainer');
            if(currentDroppable != droppableBelow) {
              if(currentDroppable) {
                currentDroppable.style.opacity = '1';
              }
                currentDroppable = droppableBelow;
              if(currentDroppable) {
                currentDroppable.style.opacity = '0.4';
              }
            }
          }

          document.addEventListener('mousemove', onMouseMove, false);

          dragSrcEl.onmouseup = (e)=>{
            document.removeEventListener('mousemove', onMouseMove);
            dragSrcEl.onmouseup = null;

            dragSrcEl.hidden = true;
            let elemBelow = document.elementFromPoint(e.clientX, e.clientY);
            dragSrcEl.hidden = false;

            if(elemBelow.className.includes('subcontainer')) {
              elemBelow.style.opacity = '1';
              dragSrcEl.style.left = elemBelow.offsetLeft+elemBelow.offsetWidth/2-dragSrcEl.offsetWidth/2+'px';
              dragSrcEl.style.top = elemBelow.offsetTop+elemBelow.offsetHeight/2-dragSrcEl.offsetHeight/2+'px';
            }
            if(elemBelow.className.includes('box')) {
              let buffer={left:elemBelow.offsetLeft+elemBelow.offsetWidth/2-dragSrcEl.offsetWidth/2+'px', top:elemBelow.offsetTop+elemBelow.offsetHeight/2-dragSrcEl.offsetHeight/2+'px'}
              elemBelow.style.left = dragSrcEl.initOffsetLeft+dragSrcEl.offsetWidth/2-elemBelow.offsetWidth/2+'px';
              elemBelow.style.top = dragSrcEl.initOffsetTop+dragSrcEl.offsetHeight/2-elemBelow.offsetHeight/2+'px';
              dragSrcEl.style.left = buffer.left;
              dragSrcEl.style.top = buffer.top;
            }
          };
        };

        handleDragStart(e);
        // функция отпускания задачи
        const drop=async (e)=>{
          // убрать градиент
          deadlineGradient.getContext("2d").clearRect(0, 0, deadlineGradient.width, deadlineGradient.height);
          const x=e.clientX, y=e.clientY,
                time=target.getBoundingClientRect().left-138+(e.pageX-x),
                initDisplayStyle=target.style.display,
                // функция возврата элемента в исходное положение
                moveToInit=()=>{
                  if(!initNextElementSibling) initParentNode.appendChild(target);
                  else initParentNode.insertBefore(target, initNextElementSibling);
                  target.style.left=initLeft;
                  target.style.top=initTop;
                  target.style.display=initDisplayStyle;
                };
          target.style.display='none';
          delete target.style['z-index'];  // вернуть элемент на слой по умолчанию
          const lastClicked=document.elementFromPoint(x,y);
          // если элемент сброшен в границы своего исходного положения - вернуть его в исходное положение
          if(initRect.left<x && x<initRect.right && initRect.top<y && y<initRect.bottom) moveToInit();
          // если элемент сброшен за границы тасклиста - вернуть его в исходное положение
          else if(lastClicked.className!=='taskLine' && lastClicked.className!=='task') moveToInit();
          // если элемент сброшен в таклист
          else {
            const machine1=target.dataset.machine,
                  machine2=lastClicked.dataset.machine,
                  newStart=new Date(dayStart.getTime()+time*canvasScale*60000-TIME_ZONE_OFFSET).toISOString().slice(0,16),
                  initialStateOfTasksInQueue=[...tasksInQueue];
            let initialTasksOfMachine1,
                initialTasksOfMachine2;
            if(machine1) initialTasksOfMachine1=[...tasks[machine1]];
            if(machine2 && machine2!=='В очереди') initialTasksOfMachine2=[...tasks[machine2]];
            // Отмена транзакции
            const  abortTransaction=()=>{
                    if(machine1) {
                      tasks[machine1]=initialTasksOfMachine1;
                      fillTaskList(tasks, machine1);
                    }
                    if(machine2) {
                      tasks[machine2]=initialTasksOfMachine2;
                      fillTaskList(tasks, machine2);
                    }
                    Object.assign(tasksInQueue, initialStateOfTasksInQueue);
                    fillTasksInQueueList(tasksInQueue);
                    target.removeEventListener('mouseup', drop , false);
                    target.addEventListener('mouseup', drop , false);
                  };
            if(machine1) {
              const {name, ID, start, duration, quantity, deadline, party, author}=tasks[machine1][target.dataset.position],
                    color=localStorage[ID+'color'];
              deleteTask(target, initNextElementSibling);
              // если перетаскивается из такслиста в тасклист
              // если перестановка задачи выполнилась неуспешно, то вернуть задачу на исходную
              if(machine2 && machine2!=='В очереди') {
                if( !createTask(ID, machine2, lastClicked, name, newStart, duration, quantity, color, deadline, party, author) ) {                
                  abortTransaction();
                  return;
                }
              // если перетаскивается из такслиста в очередь
              } else {
                const taskObject={ID:ID, name:name, duration:duration, quantity:quantity, deadline:deadline, party:party, author:author};
                if(lastClicked.className==='task') tasksInQueue.splice(+Array.from(lastClicked.parentNode.querySelectorAll('div')).indexOf(lastClicked)+1, 0, taskObject);
                else tasksInQueue.push(taskObject);
                createdTasksInQueue.push(taskObject);
                fillTasksInQueueList(tasksInQueue);
              }
            } else {
              // если перетаскивается из очереди в тасклист
              if(machine2 && machine2!=='В очереди') {
                const {ID, name, duration, quantity, deadline, party, author}=tasksInQueue[taskInQueuePosition];
                if( !createTask(ID, machine2, lastClicked, name, newStart, duration, quantity, null, deadline, party, author) ) {
                  abortTransaction();
                  return;
                } else {
                  IDsOfDeletedTasksInQueue.push(ID);
                  tasksInQueue.splice(taskInQueuePosition, 1);
                }
              // если перетаскивается из очереди в очередь
              } else {
                // добавить в конце
                if(lastClicked.className==='taskLine') {
                  tasksInQueue.push(tasksInQueue[taskInQueuePosition]);
                  tasksInQueue.splice(taskInQueuePosition, 1);
                // добавить после задачи, на которую попали
                } else {
                  const pos=Array.from(initParentNode.querySelectorAll('div')).indexOf(lastClicked),
                        task=tasksInQueue[taskInQueuePosition];
                  tasksInQueue.splice(taskInQueuePosition, 1);
                  tasksInQueue.splice(pos+1, 0, task);
                }
                fillTasksInQueueList(tasksInQueue);
              }
            }
            target.remove();
            displayedTasks.delete(lastClicked);
            if(machine1) fillTaskList(tasks, machine1);
            if(machine2 && machine2!=='В очереди') fillTaskList(tasks, machine2);
            target.style.display='block';
          }
          target.removeEventListener('mouseup', drop , false);
        }
        target.addEventListener('mouseup', drop , false);
      }
    }
  }, 100);
}, false);

// скрыть меню задачи, при выходе курсора
taskMenu.addEventListener('mouseleave', (e)=>{
  e.target.style.visibility='hidden';
}, false);

// выбрать отображаемый период
canvasHeader.addEventListener('click', (e)=>{
  periodMenu.style.visibility='visible';
  let x=e.clientX-5, y=e.clientY-5, w=document.documentElement.clientWidth-editTaskMenu.offsetWidth, h=document.documentElement.clientHeight-editTaskMenu.offsetHeight;
  if(x>w) x=w;
  if(y>h) y=h;
  periodMenu.style.left=x+'px';
  periodMenu.style.top=y+'px';
  let [dd, mm, yyyy]=dayStart.toLocaleDateString().split('.');
  periodMenuInputs[0].value=yyyy+'-'+mm+'-'+dd;
  [dd, mm, yyyy]=dayEnd.toLocaleDateString().split('.');
  periodMenuInputs[1].value=yyyy+'-'+mm+'-'+dd;
}, false);

// нажатие на меню периода
periodMenu.addEventListener('click', async (e)=>{
  if(e.target.nodeName==='BUTTON') {
    // закрытие
    if(e.target.className==='closeMenu') {
      periodMenu.style.visibility='hidden';
    // приминение
    } else {
      periodMenu.style.visibility='hidden';
      let a=new Date(periodMenuInputs[0].value+'T00:00'),
          b=new Date(periodMenuInputs[1].value+'T00:00');
      if(b-a>=0) {
        dayStart=a;
        dayEnd=b;
      } else {
        dayStart=b;
        dayEnd=a;
      }
      drawGrid(dayStart, dayEnd);
      let taskLineWidth=(dayEnd-dayStart+86400000)/60000;
      globalWidth=taskLineWidth+139+'px';
      taskLineWidth+='px';
      header.style.width=globalWidth;
      machinesTasks.style.width=globalWidth;
      for(let machine of document.querySelectorAll('.machine')) machine.style.width=globalWidth;
      for(let taskLine of document.querySelectorAll('.taskLine')) if(taskLine.dataset.machine!=='В очереди') taskLine.style.width=taskLineWidth;
      await loadTasks(dayStart, dayEnd);
    }
  }
}, false);

// нажатие на меню задачи
taskMenu.addEventListener('click', async (e)=>{
  const targetId=e.target.id;
  if(targetId==='toggleMagnet') {
    lastClicked.dataset.magnet=localStorage[tasks[lastClicked.dataset.machine][+lastClicked.dataset.position].ID+'magnet']=e.target.checked;  
  } else if(targetId==='editTask') {
    taskMenu.style.visibility='hidden';
    editTaskMenuOks[0].style.display='none';
    editTaskMenuOks[1].style.display='inline-block';
    editTaskMenuInputs[1].removeAttribute('disabled');
    let x=e.clientX-5,
        y=e.clientY-5,
        w=document.documentElement.clientWidth-editTaskMenu.offsetWidth,
        h=document.documentElement.clientHeight-editTaskMenu.offsetHeight;
    if(x>w) x=w;
    if(y>h) y=h;
    editTaskMenu.style.left=x+'px';
    editTaskMenu.style.top=y+'px';
    if(lastClicked.parentNode.dataset.machine==='В очереди') {
      const {ID, name, duration, quantity, deadline, party, author}=tasksInQueue[Array.from(lastClicked.parentNode.querySelectorAll('div')).indexOf(lastClicked)];
      if(await blockID(ID)) {
        editTaskMenu.style.visibility='visible';
        editableID=ID;
        editTaskMenuInputs[1].setAttribute('disabled', 'disabled');
        editTaskMenuInputs[4].setAttribute('disabled', 'disabled');
        editTaskMenuInputs[0].value=name;
        editTaskMenuInputs[2].value=duration;
        editTaskMenuInputs[3].value=quantity;
        editTaskMenuInputs[5].value=(deadline) ? deadline.slice(0,10) : null;
        editTaskMenuInputs[7].value=author || "";
      } else {
        editTaskMenu.style.visibility='hidden';
        alert('Редактирование задачи заблокироано другим пользователем');
      }
    } else {
      const {ID, name, start, duration, quantity, deadline, party, author}=tasks[lastClicked.dataset.machine][lastClicked.dataset.position];
      if(await blockID(ID)) {
        editTaskMenu.style.visibility='visible';
        editableID=ID;
        editTaskMenuInputs[1].removeAttribute('disabled');
        editTaskMenuInputs[4].removeAttribute('disabled');
        editTaskMenuInputs[0].value=name;
        editTaskMenuInputs[1].value=start;
        editTaskMenuInputs[2].value=duration;
        editTaskMenuInputs[3].value=quantity;
        editTaskMenuInputs[4].value=lastClicked.style['background-color'].replace(/rgb\((\d+), (\d+), (\d+)\)/, (r,a,b,c)=>{return '#'+(+a).toString(16).padStart(2, "0")+(+b).toString(16).padStart(2, "0")+(+c).toString(16).padStart(2, "0");}) || backgroundColorDefault;
        editTaskMenuInputs[5].value=(deadline) ? deadline.slice(0,10) : null;
        editTaskMenuInputs[6].value=party || "";
        editTaskMenuInputs[7].value=author || "";
      } else {
        editTaskMenu.style.visibility='hidden';
        alert('Редактирование задачи заблокироано другим пользователем');
      }
    }
  } else if(targetId==='removeTask') {
    taskMenu.style.visibility='hidden';
    deleteTask(lastClicked);
    fillTaskList(tasks, lastClicked.dataset.machine);
  } else if(targetId==='addTask') {
    // подставляем время из точки нажатия
    editTaskMenuInputs[1].value=new Date(dayStart.getTime()-TIME_ZONE_OFFSET+(lastClickedXPoint-138)*canvasScale*60000).toISOString().slice(0,16);
    // цвет по умолчанию зеленый
    editTaskMenuInputs[4].value=backgroundColorDefault;
    // автор по умолчанию последний
    editTaskMenuInputs[7].value=localStorage.author || "";
    taskMenu.style.visibility='hidden';
    editTaskMenuOks[0].style.display='inline-block';
    editTaskMenuOks[1].style.display='none';
    if(lastClicked.dataset.machine==='В очереди' || lastClicked.parentNode.dataset.machine==='В очереди') {
      editTaskMenuInputs[1].setAttribute('disabled', 'disabled');
      editTaskMenuInputs[4].setAttribute('disabled', 'disabled');
    } else {
      editTaskMenuInputs[4].removeAttribute('disabled');
      (lastClicked.className==='task') ? editTaskMenuInputs[1].setAttribute('disabled', 'disabled') : editTaskMenuInputs[1].removeAttribute('disabled');
    }
    let x=e.clientX-5, y=e.clientY-5, w=document.documentElement.clientWidth-editTaskMenu.offsetWidth, h=document.documentElement.clientHeight-editTaskMenu.offsetHeight;
    if(x>w) x=w;
    if(y>h) y=h;
    editTaskMenu.style.left=x+'px';
    editTaskMenu.style.top=y+'px';
    editTaskMenu.style.visibility='visible';
  }
}, false);

// нажатие на меню редактироания задачи
editTaskMenu.addEventListener('click', async (e)=>{
  const targetClassName=e.target.className;
  if(targetClassName==='closeMenu') {
    editTaskMenu.style.visibility='hidden';
    unblockID(editableID);
  } else if(targetClassName==='editTaskMenuOk') {
    editTaskMenu.style.visibility='hidden';
    let filled=true;
    for(let i=4; i--;) {
      if(!editTaskMenuInputs[i].value && !editTaskMenuInputs[i].hasAttribute('disabled')) {
        filled=false;
        break;
      }
    }
    if(filled) {
      // обычная задача
      if(lastClicked.dataset.machine!=='В очереди' && lastClicked.parentNode.dataset.machine!=='В очереди') {
        const machine=lastClicked.dataset.machine,
              pos=+lastClicked.dataset.position,  // + чтобы сделать числом
              newDuration=editTaskMenuInputs[2].value,
              newQuantity=editTaskMenuInputs[3].value;
        if(new Date(editTaskMenuInputs[1].value)<dayStart) return alert('Создаваемая задача начинается за пределами выбранного периода. Измените период.');
        let  [h2, m2]=newDuration.split(':'), newDurationAndQuantity=(+m2+h2*60)*newQuantity;
        if(newDurationAndQuantity<4) return alert('Невозможно создавать задачи, короче 4х минут.');
        if(newDurationAndQuantity>86400000) return alert('Невозможно создавать задачи, длиннее 24 часов. Разбейте на несколько задач.');
        // если добавляем задачу
        if(e.target.value==='добавить' || e.target.innerHTML==='добавить') {
          const ID=await createID();
          localStorage.author=editTaskMenuInputs[7].value || "";
          createTask(ID, machine, lastClicked, editTaskMenuInputs[0].value, editTaskMenuInputs[1].value, editTaskMenuInputs[2].value, editTaskMenuInputs[3].value, editTaskMenuInputs[4].value, editTaskMenuInputs[5].value, editTaskMenuInputs[6].value, editTaskMenuInputs[7].value);
        // если редактируем задачу
        } else {
          const initialTasksOfMachine=[...tasks[machine]],
                prevDuration=tasks[machine][pos].duration,
                prevQuantity=tasks[machine][pos].quantity,
                newDuration=editTaskMenuInputs[2].value,
                newQuantity=editTaskMenuInputs[3].value,
                ID=tasks[machine][pos].ID;
          let cur=lastClicked,
              [h1, m1]=prevDuration.split(':'),
              [h2, m2]=newDuration.split(':'),
              party=editTaskMenuInputs[6].value,
              author=editTaskMenuInputs[7].value;
          localStorage[ID+'color']=editTaskMenuInputs[4].value;
          tasks[lastClicked.dataset.machine][pos]={ID:ID, name:editTaskMenuInputs[0].value, start:editTaskMenuInputs[1].value, duration:newDuration, quantity:newQuantity, deadline:editTaskMenuInputs[5].value, party:party, author:author};
          if(author) authors.add(author);
          if(party) partys.add(party);
          const durationShift=((+m1+h1*60)*prevQuantity-(+m2+h2*60)*newQuantity)*60000;
          // смещение примагниченных назад, если длительность задачи уменьшается
          if(durationShift>0 && cur) {
            for(let i=+cur.dataset.position+1, end=tasks[machine].length; i<end; i++) {
              if(cur.dataset.magnet==='true') {
                tasks[machine][i].start=new Date(new Date(tasks[machine][i].start).getTime()-durationShift-TIME_ZONE_OFFSET).toISOString().slice(0,16);
                cur=cur.nextElementSibling;
              } else {
                break;
              }
            }
          }
          // сместить остальные задачи или вернуться к исходному в случае неудачи
          if( !shiftRestTasks(pos, machine) ) {
            tasks[machine]=initialTasksOfMachine;
            return false;
          }
          unblockID(editableID);
        }
        displayedTasks.delete(lastClicked);
        fillTaskList(tasks, machine);
      // задача редактируемая в очереди или добавляемая в очередь
      } else {
        const [h2, m2]=editTaskMenuInputs[2].value.split(':'),
              taskObject={name:editTaskMenuInputs[0].value, duration:editTaskMenuInputs[2].value, quantity:editTaskMenuInputs[3].value, deadline:editTaskMenuInputs[5].value, party:editTaskMenuInputs[6].value, author:editTaskMenuInputs[7].value};
        if((+m2+h2*60)*editTaskMenuInputs[3].value<4) return alert('Невозможно создавать задачи, короче 4х минут.');
        // если редактируем задачу
        if(lastClicked.className==='task') {
          const pos=+Array.from(lastClicked.parentNode.querySelectorAll('div')).indexOf(lastClicked),
                ID=tasksInQueue[pos].ID;
          taskObject.ID=ID;
          IDsOfDeletedTasksInQueue.push(ID);
          createdTasksInQueue.push(taskObject);
          tasksInQueue.splice(pos, 1, taskObject);
          unblockID(editableID);
        }
        // если добавляем задачу
        else {
          taskObject.ID=await createID();
          createdTasksInQueue.push(taskObject);
          tasksInQueue.push(taskObject);
        }
        fillTasksInQueueList(tasksInQueue);
      }
    }
  }
}, false);

settingsButton.addEventListener('click', (e)=>{
  settingsMenu.style.visibility='visible';
}, false);

settingsMenu.addEventListener('click', (e)=>{
  // закрытие
  if(e.target.className==='closeMenu') {
    settingsMenu.style.visibility='hidden';
  // приминение
  } else {
    if(e.target.value==='Скрыть станки') {
      settingsMenu.style.visibility='hidden';
      hideMachinesTable.parentNode.parentNode.parentNode.style.visibility='visible';
    } else if(e.target.value==='Скрыть задачи авторов') {
      settingsMenu.style.visibility='hidden';
      authorsListTable.innerHTML+='<tr><td>Без автора</td><td><input type="checkbox" name="Без автора" checked></td></tr>'
      for(let name of authors.keys()) if(name) authorsListTable.innerHTML+=`<tr><td>${name}</td><td><input type="checkbox" name="${name}" checked></td></tr>`;
      authorsListTable.parentNode.parentNode.parentNode.style.visibility='visible';
    } else if(e.target.value==='Скрыть партии') {
      settingsMenu.style.visibility='hidden';
      partysListTable.innerHTML+='<tr><td>Без партии</td><td><input type="checkbox" name="Без партии" checked></td></tr>'
      for(let name of partys.keys()) if(name) partysListTable.innerHTML+=`<tr><td>${name}</td><td><input type="checkbox" name="${name}" checked></td></tr>`;
      partysListTable.parentNode.parentNode.parentNode.style.visibility='visible';
    }
  }
}, false);

// скрыть станки
hideMachinesTable.addEventListener('click', (e)=>{
  const t=e.target, name=t.name;
  if(name) {
		const names=machinesTasks.querySelectorAll('.name');
		if(name==='Показать все') {
			const ch=t.checked,
			      state=ch ? 'block' : 'none',
						inputs=t.parentNode.parentNode.parentNode.querySelectorAll('input');
			for(let i=names.length-1; i--;) names[i].parentNode.style.display=state;
			for(let i=inputs.length; --i;) inputs[i].checked=ch;
		} else {
			let i=0;
			while(names[i].innerHTML!==name) i++;
			const cur=names[i].parentNode.style;
			cur.display=(cur.display!=='none') ? 'none' : 'block';
		}
  }
}, false);
hideMachinesTable.parentNode.parentNode.parentNode.addEventListener('mouseleave', (e)=>{
  e.target.style.visibility='hidden';
}, false);

// скрыть авторов
authorsListTable.addEventListener('click', (e)=>{
  const t=e.target;
	let author=t.name;
  if(author) {
    if(author==='Без автора') author='';
    const names=machinesTasks.querySelectorAll('.name');
		if(author==='Показать все') {
			const ch=t.checked,
			      state=ch ? '1' : '0.2',
						inputs=t.parentNode.parentNode.parentNode.querySelectorAll('input'),
						divTasks=machinesTasks.querySelectorAll('.task');
			for(let i=divTasks.length; i--;) {
				const cur=divTasks[i];
				if(cur.parentNode.dataset.machine!=='В очереди') cur.style.opacity=state;
			}
			for(let i=inputs.length; --i;) inputs[i].checked=ch;
		} else {
			for(let machineName in tasks) {
				const tasksOfMachine=tasks[machineName];
				let i=0;
				while(names[i].innerHTML!==machineName) i++;
				for(let task in tasksOfMachine) {
					if(tasksOfMachine[task].author===author) {
						const cur=names[i].nextElementSibling.childNodes[task].style;
						cur.opacity=(cur.opacity!=='0.2') ? '0.2' : '1';
					}
				}
			}
		}
  }
}, false);
authorsListTable.parentNode.parentNode.parentNode.addEventListener('mouseleave', (e)=>{
  e.target.style.visibility='hidden';
}, false);

// скрыть партии
partysListTable.addEventListener('click', (e)=>{
  const t=e.target;
  let party=t.name;
  if(party) {
    if(party==='Без партии') party='';
    const names=machinesTasks.querySelectorAll('.name');
		if(party==='Показать все') {
			const ch=t.checked,
			      state=ch ? '1' : '0.2',
						inputs=t.parentNode.parentNode.parentNode.querySelectorAll('input'),
						divTasks=machinesTasks.querySelectorAll('.task');
			for(let i=divTasks.length; i--;) {
				const cur=divTasks[i];
				if(cur.parentNode.dataset.machine!=='В очереди') cur.style.opacity=state;
			}
			for(let i=inputs.length; --i;) inputs[i].checked=ch;
		} else {
			for(let machineName in tasks) {
				const tasksOfMachine=tasks[machineName];
				let i=0;
				while(names[i].innerHTML!==machineName) i++;
				for(let task in tasksOfMachine) {
					if(tasksOfMachine[task].party===party) {
						const cur=names[i].nextElementSibling.childNodes[task].style;
						cur.opacity=(cur.opacity!=='0.2') ? '0.2' : '1';
					}
				}
			}
		}
  }
}, false);
partysListTable.parentNode.parentNode.parentNode.addEventListener('mouseleave', (e)=>{
  e.target.style.visibility='hidden';
}, false);

// изменить интерал синхронизации
settingsInput[0].addEventListener('change', (e)=>{
  syncronizationInterval=e.target.value;
  clearInterval(syncronizator);
  syncronizator=setInterval(async ()=>{await loadTasks(dayStart, dayEnd)}, syncronizationInterval*60000);
}, false);

// изменить цвет задач по умолчанию
settingsInput[1].addEventListener('change', (e)=>{
  backgroundColorDefault=e.target.value;
}, false);

// включить/выключить магнит по умолчанию
settingsInput[2].addEventListener('change', (e)=>{
  magnetDefault=e.target.checked;
}, false);

// обработка отмены
document.addEventListener('keydown', (e)=>{
  if(e.keyCode===27) {
    if(editTaskMenu.style.visibility!=='hidden') editTaskMenu.style.visibility='hidden';
    else if(periodMenu.style.visibility!=='hidden') periodMenu.style.visibility='hidden';
    else if(settingsMenu.style.visibility!=='hidden') settingsMenu.style.visibility='hidden';
    else if(taskMenu.style.visibility!=='hidden') taskMenu.style.visibility='hidden';
  }
}, false);

// перед выходом // перед закрытием
window.onbeforeunload=()=>{
  localStorage.dayStart=JSON.stringify(dayStart);
  localStorage.dayEnd=JSON.stringify(dayEnd);
  localStorage.tasks=JSON.stringify(tasks);
  localStorage.tasksInQueue=JSON.stringify(tasksInQueue);
  localStorage.IDsOfDeletedTasks=JSON.stringify(IDsOfDeletedTasks);
  localStorage.IDsOfDeletedTasksInQueue=JSON.stringify(IDsOfDeletedTasksInQueue);
  localStorage.createdTasks==JSON.stringify(createdTasks);
  localStorage.createdTasksInQueue=JSON.stringify(createdTasksInQueue);
  localStorage.canvasScale=canvasScale;
  localStorage.syncronizationInterval=syncronizationInterval;
  localStorage.backgroundColorDefault=backgroundColorDefault;
  localStorage.magnetDefault=magnetDefault;
}

}// end of window.onload