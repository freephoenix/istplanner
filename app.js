//https://istplanner.herokuapp.com/
"use strict"
const express = require('express'),
      app = express(),
      path = require('path'),
      fs=require('fs'),
      port = process.env.PORT || 3000,
      uri = process.env.MONGODB_URI || "mongodb+srv://freephoenix:6zhDHSJypKudQOwB@cluster0.k7udb.mongodb.net/ist?retryWrites=true&w=majority", //'mongodb://localhost:27017/ist'
      mongoose = require('mongoose'),
      Schema = mongoose.Schema,
			setOfIDs=new Set(),
			blockedIDs=new Set();

// to prevent crash and exit
process.setUncaughtExceptionCaptureCallback(e => {
  console.error("Uncaught asynchronous exception:", e);
});

app.set('port', port);
app.use(express.static(__dirname));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('open', function() {
    console.log('Mongoose connected.');
});

// Schema
const TaskSchema = new Schema({
				machine: { type: String, required: true },
				ID: { type: String, required: true },
				name: { type: String, required: true },
				start: { type: Date, required: true },
				duration: { type: String, required: true },
				quantity: { type: Number, required: true, default: 1 },
				deadline: { type: Date, required: false },
				party: { type: String, required: false },
				author: { type: String, required: false },
			}),
      TaskModel = mongoose.model('Task', TaskSchema),
			TaskInQueueSchema = new Schema({
				ID: { type: String, required: true },
				name: { type: String, required: true},
				duration: { type: String, required: true},
				quantity: { type: Number, required: true, default: 1 },
				deadline: { type: Date, required: false },
				party: { type: String, required: false },
				author: { type: String, required: false },
			}),
			TaskInQueueModel = mongoose.model('TaskInQueue', TaskInQueueSchema);

app.put('/loadTasks', async (req, res)=>{
  let {dayStart, dayEnd}=req.body,
	    loadedTasks=await TaskModel.find({start:{$gt:new Date(dayStart), $lte:new Date(dayEnd)}}),
			loadedTasksInQueue=await TaskInQueueModel.find();
	res.send({loadedTasks:loadedTasks, loadedTasksInQueue:loadedTasksInQueue});
});

app.post('/sendTasks', async (req, res)=>{
	try {
		let {IDsOfDeletedTasks, tasks, IDsOfDeletedTasksInQueue, createdTasksInQueue}=req.body;
		// удалить удаленные задачи
		if(IDsOfDeletedTasks.length>0) for (let ID of IDsOfDeletedTasks) await TaskModel.deleteOne({ID:ID});
		// обновить присланные задачи
		for(let machine in tasks) {
			const machineTasks=tasks[machine];
			for (let task of machineTasks) {
				task.machine=machine;
				await TaskModel.deleteOne({'ID':task.ID});
				await TaskModel(task).save();
			}
		}
    // удалить удаленные задачи в очереди
		if(IDsOfDeletedTasksInQueue.length>0) for (let ID of IDsOfDeletedTasksInQueue) await TaskInQueueModel.deleteOne({ID:ID});

		// обновить присланные задачи
		for(let task of createdTasksInQueue) {
			await TaskInQueueModel.deleteOne({'ID':task.ID});
		  await TaskInQueueModel(task).save();
		}
	  res.sendStatus(200);
	} catch(e) {
		console.info(e);
		res.status(500).send(e);
	}
});

// автозагрузчик длительности задачи из базы данных
app.put('/loadDuration', async (req, res)=>{
	try {
		const {name}=req.body,
		loadedTasks=await TaskModel.find({name:name}).sort({start: -1});	// загружаем длительность последней из таких задач
		if(loadedTasks.length===0) {
			res.send("");
		} else {
			res.send(loadedTasks[0].duration);
		}
	} catch(e) {
		console.info(e);
		res.status(500).send(e);
	}
});

app.get('/getID', async (req, res)=>{
	try {
		if(setOfIDs.size===0) { // если переменная пустая, загружаем все занятые ID
			const tasks=await TaskModel.find();	
			for(let i=tasks.length; i--;) setOfIDs.add(tasks[i].ID);
		}
		let ID;
		do ID=''+Math.floor(Math.random()*9999999999);
		while(setOfIDs.has(ID));
		setOfIDs.add(ID);
		res.send(ID);
	} catch(e) {
		res.status(500).send(e);
	}
});

app.post('/blockID', async (req, res)=>{
	try {
		const {ID}=req.body;
		if(blockedIDs.has(ID)) {
			res.status(200).send({granted:false});
		} else {
			blockedIDs.add(ID);
			// автоматически разблокироать ID через 10 минут
			setTimeout(()=>blockedIDs.delete(ID), 600000, ID);
			res.status(200).send({granted:true});
		}
	} catch(e) {
		res.status(500).send(e);
	}
});

app.post('/unblockID', async (req, res)=>{
	try {
		const {ID}=req.body;
		blockedIDs.delete(ID);
		res.sendStatus(200);
	} catch(e) {
		res.status(500).send(e);
	}
});

// запуск сервера и безопасное закрытие
const server = app.listen(port, ()=>console.log(`listening on ${app.get("port")} in ${app.get('env')}`)),
      cleanup=()=>{
				console.info('SIGTERM signal received.');
				console.log('Closing mongoose connection and http server.');
				mongoose.connection.close();
				server.close(()=>{
					console.log('Http server closed.');
				});
			};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

app.use((req, res)=>{
  res.type('text/plain');
  res.status(404);
  res.send('404-not found');
});
app.use((req, res)=>{
  res.type('text/plain');
  res.status(500);
  res.send('500-server error');
});