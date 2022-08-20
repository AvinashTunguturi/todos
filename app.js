const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const priorityList = ["HIGH", "MEDIUM", "LOW"];
const categoryList = ["WORK", "HOME", "LEARNING"];
const statusList = ["TO DO", "IN PROGRESS", "DONE"];

convertTodoObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

function isValidPriority(priority) {
  const isValidPriority = priorityList.includes(priority);
  return isValidPriority;
}

function isValidStatus(status) {
  const isValidStatus = statusList.includes(status);
  return isValidStatus;
}

function isValidCategory(category) {
  const isValidCategory = categoryList.includes(category);
  return isValidCategory;
}

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      if (!isValidStatus(status)) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else if (!isValidPriority(priority)) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      }
      break;
    case hasPriorityProperty(request.query):
      if (!isValidPriority(priority)) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      }
      break;
    case hasStatusProperty(request.query):
      if (!isValidStatus(status)) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      }
      break;
    case hasCategoryAndStatusProperties(request.query):
      if (!isValidCategory(category)) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else if (!isValidStatus(status)) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}'`;
      }
      break;
    case hasCategoryAndPriorityProperties(request.query):
      if (!isValidCategory(category)) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else if (!isValidPriority(priority)) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      }
      break;
    case hasCategoryProperty(request.query):
      if (!isValidCategory(category)) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      }
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  data = await database.all(getTodosQuery);
  response.send(
    data.map((eachTodo) => convertTodoObjectToResponseObject(eachTodo))
  );
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(convertTodoObjectToResponseObject(todo));
});

app.get("/agenda/", async (request, response) => {
  const { date = "" } = request.query;

  const isDateValid = isValid(new Date(date));
  if (!isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQueryOnSpecificDate = `
  SELECT * FROM todo WHERE due_date= '${formattedDate}'`;

    const todo = await database.all(getTodoQueryOnSpecificDate);
    response.send(
      todo.map((eachTodo) => convertTodoObjectToResponseObject(eachTodo))
    );
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const isDateValid = isValid(new Date(dueDate));

  if (!isValidPriority(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!isValidStatus(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!isValidCategory(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (!isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const postTodoQuery = `
        INSERT INTO
          todo (id, todo, priority, status,category,due_date)
        VALUES
          (${id}, '${todo}', '${priority}', '${status}','${category}','${dueDate}');`;

    await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const reqBody = request.body;
  if (reqBody.status !== undefined) {
    const isValidStatus = statusList.includes(reqBody.status);
    if (!isValidStatus) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else {
      updateColumn = "Status";
    }
  } else if (reqBody.priority !== undefined) {
    const isValidPriority = priorityList.includes(reqBody.priority);
    if (!isValidPriority) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else {
      updateColumn = "Priority";
    }
  } else if (reqBody.todo !== undefined) {
    updateColumn = "Todo";
  } else if (reqBody.category !== undefined) {
    const isValidCategory = categoryList.includes(reqBody.category);
    if (!isValidCategory) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      updateColumn = "Category";
    }
  } else if (reqBody.dueDate !== undefined) {
    const isDateValid = isValid(new Date(reqBody.dueDate));
    if (!isDateValid) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      updateColumn = "Due Date";
    }
  }

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${dueDate}'
    WHERE
      id = ${todoId};`;

  await database.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

module.exports = app;
