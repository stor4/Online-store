//Каркас

function createStore(reducer) {
    let state = reducer(undefined, {}) //стартовая инициализация состояния, запуск редьюсера со state === undefined
    let cbs = []                     //массив подписчиков

    const getState = () => state            //функция, возвращающая переменную из замыкания
    const subscribe = cb => (cbs.push(cb),   //запоминаем подписчиков в массиве
        () => cbs = cbs.filter(c => c !== cb)) //возвращаем функцию unsubscribe, которая удаляет подписчика из списка

    const dispatch = action => {
        if (typeof action === 'function') { //если action - не объект, а функция
            return action(dispatch, getState) //запускаем эту функцию и даем ей dispatch и getState для работы
        }
        const newState = reducer(state, action) //пробуем запустить редьюсер
        if (newState !== state) { //проверяем, смог ли редьюсер обработать action
            state = newState //если смог, то обновляем state
            for (let cb of cbs) cb(state) //и запускаем подписчиков
        }
    }

    return {
        getState, //добавление функции getState в результирующий объект
        dispatch,
        subscribe //добавление subscribe в объект
    }
}

function localStoredReducer(originalReducer, localStorageKey) {
    function wrapper(state, action) {
        // let testState = state
        const original = originalReducer(state, action)
        try {
            const storageItem = localStorage.getItem(localStorageKey) || localStorage.localStorageKey //По другому оно не работает почему-то
            const parsed = JSON.parse(storageItem)
            if (!state) {
                return parsed
            }
        } catch (e) {
            localStorage.setItem(localStorageKey, JSON.stringify(original))
            return original
        }
        localStorage.setItem(localStorageKey, JSON.stringify(original))
        return original
        // ...... your magic here
    }

    return wrapper
}

function combineReducers(reducers) {
    function totalReducer(state = {}, action) {
        const newTotalState = {}
        for (const [reducerName, reducer] of Object.entries(reducers)) {
            const newSubState = reducer(state[reducerName], action)
            if (newSubState !== state[reducerName]) {
                newTotalState[reducerName] = newSubState
            }
        }
        if (Object.keys(newTotalState).length) {
            return {...state, ...newTotalState}
        }
        return state
    }

    // return localStoredReducer(totalReducer, localStorage.total)

    return totalReducer
}

function jwtDecode(token) {
    if (token == '' || token === undefined || token.includes('.') === false) {
        return
    }
    const splited = token.split('.')
    try {
        return JSON.parse(atob(splited[1]))
    } catch (error) {
        return
    }
}

const reducers = {
    promise: promiseReducer, //допилить много имен для многих промисо
    auth: localStoredReducer(authReducer, 'auth'),     //часть предыдущего ДЗ
    cart: localStoredReducer(cartReducer, 'cart'),     //часть предыдущего ДЗ
}

const actionAuthLogin = token => ({type: 'AUTH_LOGIN', token})
const actionAuthLogout = () => ({type: 'AUTH_LOGOUT'})

function authReducer(state = {}, {type, token}) {
    if (type === 'AUTH_LOGIN') {
        const payload = jwtDecode(token)
        console.log(payload)
        return {token, payload}

    }
    if (type === 'AUTH_LOGOUT') {
        return {}
    }
    return state
}

const totalReducer = combineReducers(reducers)

function promiseReducer(state = {}, {type, status, payload, error, name}) {
    if (type === 'PROMISE') {
        //имена добавить
        return {...state, [name]: {status, payload, error}}
    }
    return state
}

//имена добавить
const actionPending = (name) => ({name, type: 'PROMISE', status: 'PENDING'})
const actionFulfilled = (name, payload) => ({name, type: 'PROMISE', status: 'FULFILLED', payload})
const actionRejected = (name, error) => ({name, type: 'PROMISE', status: 'REJECTED', error})

//имена добавить
const actionPromise = (name, promise) =>
    async dispatch => {
        dispatch(actionPending(name)) //сигнализируем redux, что промис начался
        try {
            const payload = await promise //ожидаем промиса
            dispatch(actionFulfilled(name, payload)) //сигнализируем redux, что промис успешно выполнен
            return payload //в месте запуска store.dispatch с этим thunk можно так же получить результат промиса
        } catch (error) {
            dispatch(actionRejected(name, error)) //в случае ошибки - сигнализируем redux, что промис несложился
        }
    }


const store = createStore(totalReducer) //не забудьте combineReducers если он у вас уже есть

store.subscribe(() => console.log(store.getState()))


//CartReducer

function cartReducer(state = {}, {type, count, good}) {

    if (type === 'CART_ADD') {
        // debugger
        const currentCart = state[good._id]
        // console.log(currentCart)
        const result = currentCart ? currentCart.count + count : count
        return {
            ...state,
            [good._id]: {good, count: result}
        }
    }

    if (type === 'CART_SUB') {
        // debugger
        const currentCart = state[good._id]
        const newCount = currentCart.count - count
        if (newCount <= 0) {
            const newCartState = {...state}
            delete newCartState[good._id]
            return newCartState
        }

        return {
            ...state,
            [good._id]: {good: currentCart.good, count: newCount}
        }
    }

    if (type === 'CART_DEL') {
        const newCartState = {...state}
        delete newCartState[good._id]
        return newCartState
    }

    if (type === 'CART_SET') {
        if (count <= 0) {
            const newCartState = {...state}
            delete newCartState[good._id]
            return newCartState
        } else {
            return {
                ...state,
                [good._id]: {good, count}
            }
        }
    }

    if (type === 'CART_CLEAR') {
        return {}
    }
    return state

}

const actionCartAdd = (good, count = 1) => ({type: 'CART_ADD', count, good})
const actionCartSub = (good, count = 1) => ({type: 'CART_SUB', count, good})
const actionCartDel = (good) => ({type: 'CART_DEL', good})
const actionCartSet = (good, count = 1) => ({type: 'CART_SET', count, good})
const actionCartClear = () => ({type: 'CART_CLEAR'})


store.subscribe(() => console.log(store.getState())) //

console.log(store.getState()) //{}

const drawCategory = (state) => {
    const [, route] = location.hash.split('/')
    if (route !== 'category') return

    const {status, payload, error} = store.getState().promise.OneCat || {};//.имя другое
    if (status === 'PENDING') {
        main.innerHTML = `<img src='https://cdn.dribbble.com/users/63485/screenshots/1309731/infinite-gif-preloader.gif' />`
    }
    if (status === 'FULFILLED') {

        const {name, goods, parent, subCategories} = payload
        main.innerHTML = `<h1>${name}</h1>
                         
                         <section style="color: ${subCategories}</section>
                         `
        for (const {_id, name, price, images} of goods) {
            // const filmId = filmUrl.split('/films/')[1].slice(0,-1)
            main.innerHTML += `<a href="#/good/${_id}">
            <div style="display:flex; flex-direction: row; justify-content: space-around; align-items: center;">
            <h4 style="margin: 10px 0 10px 0;">${name}</h4>
            <br>
            </a><img src="http://shop-roles.node.ed.asmer.org.ua/${images[0].url}" style="height: 200px; width: 200px;">
            <h3>${price} тенге</h3>
            </div>`
        }
    }
}

store.subscribe(drawCategory)

const orderbtn = document.createElement('button')

orderbtn.innerText = 'Добавить в корзину'

store.subscribe(() => {
    const [, route] = location.hash.split('/')
    if (route !== 'good') return

    const {status, payload, error} = store.getState().promise.OneGood || {}//.имя одно
    if (status === 'PENDING') {
        main.innerHTML = `<img src='https://cdn.dribbble.com/users/63485/screenshots/1309731/infinite-gif-preloader.gif' />`
    }
    if (status === 'FULFILLED') {
        const {name, price, description, images,} = payload
        main.innerHTML = `<h1>${name}</h1>
                         <img src="http://shop-roles.node.ed.asmer.org.ua/${images[0].url}" style="height: 200px; width: 200px;">
                         <p>Цена: ${price}</p>
                         <p>${description}</p>
                         `
        orderbtn.onclick = () => store.dispatch(actionCartAdd(payload,))
        if (store.getState().auth.token) {
            main.appendChild(orderbtn)
        }


        for (const _id of store.getState().promise.OneGood.payload) {
            // const peopleId = peopleUrl.split('/people/')[1].slice(0,-1)
            main.innerHTML += `<a href="#/item/${_id}"></a>`
        }
    }
})

store.subscribe(() => {
    const {status, payload, error} = store.getState().promise.RootCats || {}//.имя третье
    if (status === 'FULFILLED' && payload) {
        aside.innerHTML = ''

        for (const {_id, name} of payload) {
            // const peopleId = peopleUrl.split('/people/')[1].slice(0,-1)
            aside.innerHTML += `<a href="#/category/${_id}"> ${name}</a>`
        }
    }
})


async function getGql(query, variables = {}) {
    const url = "http://shop-roles.node.ed.asmer.org.ua/graphql"
    let result
    try {
        const queryResult = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(store.getState().auth.token ? {authorization: `Bearer ` + store.getState().auth.token} : {})
            },
            body: JSON.stringify({
                query,
                variables
            })
        })
        result = await queryResult.json()
        if (result.errors) {
            throw new Error(JSON.stringify(result.errors))
        }
        return Object.values(result.data)[0]
    } catch (error) {
        return error
    }
}

// console.log(getGql(rootCats,))

function gql(url, query, variables) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',

        },
        body: JSON.stringify({
            query,
            variables
        })
    }).then((res) => res.json())
}

// Запрос на список корневых категорий

const rootCats = `query rootCats($q:String){
    CategoryFind(query:$q){
      _id name parent{
        _id name
      }
    }
  }`

const actionRootCats = () => actionPromise('RootCats', getGql(rootCats, {q: JSON.stringify([{parent: null}])}))


store.dispatch(actionRootCats())

//Запрос для получения одной категории с товарами и картинками

const categoryFindOne = `query OneCat($q1:String){
    CategoryFindOne(query:$q1){
      _id name goods {_id, name, price, images{url}}
      parent{_id name}
      subCategories {_id name}
    }
  }`

const actionCategoryById = (_id) => actionPromise('OneCat', getGql(categoryFindOne, {q1: JSON.stringify([{_id}])}))

// Запрос на получение товара с описанием и картинками

const oneGood = `query oneGoods($q3:String){
    GoodFindOne(query:$q3){
      _id name price description images{url}
    }
  }`
const gqlOneGood = () => gql("http://shop-roles.node.ed.asmer.org.ua/graphql", oneGood, {q3: "[{\"_id\":\"62d30938b74e1f5f2ec1a124\"}]"})
const actionGoodById = (_id) => actionPromise('OneGood', getGql(oneGood, {q3: JSON.stringify([{_id}])}))

// Запрос на регистрацию

const userUpsert = `mutation Reg($login:String, $password:String){
    UserUpsert(user:{login:$login, password:$password}){
      _id, login
    }
  }`

const actionUpsert = (login, password) => actionPromise('UserUpsert', gql("http://shop-roles.node.ed.asmer.org.ua/graphql", userUpsert, {
    login: login,
    password: password
}))

const upsertForm = () => {

    const [, route] = location.hash.split('/')
    if (route !== 'upsert') return

    main.innerHTML = `<h1>РЕГИСТРАЦИЯ</h1>
                      <input placeholder='Логин' id='upsertLogin'></input>
                      <input placeholder='Пароль' id='upsertPsw'></input>
                      <button id='upsertbtn'>Зарегаться</button>
    `

    const login = document.getElementById('upsertLogin')
    const psw = document.getElementById('upsertPsw')
    const btn = document.getElementById('upsertbtn')
    btn.onclick = async () => {
        await store.dispatch(actionFullRegister(login.value, psw.value))
    }


}

store.subscribe(upsertForm)

// Запрос на логин

const userLogin = `query login($login:String, $password:String){
    login(login:$login, password:$password)
}`
const actionLogin = (login, password) => actionPromise('UserLogin', getGql(userLogin, {
    login: login,
    password: password
}))


const loginForm = () => {
    const [, route] = location.hash.split('/')
    if (route !== 'login') return

    main.innerHTML = `<h1>ВХОД</h1>
                      <input placeholder='Логин' id='loginvalue'></input>
                      <input placeholder='Пароль' id='pswvalue'></input>  
                     <button id='loginbtn'>Войти</button> 
                     `
    const login = document.getElementById('loginvalue')
    const psw = document.getElementById('pswvalue')
    const btn = document.getElementById('loginbtn')
    btn.onclick = () => store.dispatch(actionFullLogin(login.value, psw.value))
}

store.subscribe(loginForm)

const actionFullLogin = (login, password) => {
    return async dispatch => {
        // debugger
        const token = await dispatch(actionLogin(login, password))
        console.log(token)
        if (typeof token === 'string') {
            return dispatch(actionAuthLogin(token))
        } else return

    }
}

const actionFullRegister = (login, password) => {
    return async dispatch => {
        await dispatch(actionUpsert(login, password))
        const {data, errors} = store.getState().promise.UserUpsert.payload
        if (errors) {
            return
        }
        await dispatch(actionFullLogin(login, password))
    }
}


const loginValue = document.createElement('div')
const logoutbtn = document.createElement('a')
const upsertBTN = document.createElement('a')
const historyBtn = document.createElement('a')
loginDiv.appendChild(loginValue)
loginDiv.appendChild(logoutbtn)

logoutbtn.style = `opacity: 0;`
historyBtn.innerText = 'История заказов'
historyBtn.href = "#/history/"
const cartIcon = document.getElementById('cartIcon')
const cartValue = document.getElementById('cartValue')


const loginStatus = (state) => {
    // console.log(Object.keys(store.getState().auth))

    let tokenCheck

    if (tokenCheck !== undefined) {
        loginValue.innerHTML = 'Привет, анониим!'
        return
    }
    const {token, payload} = store.getState().auth || {}//.имя третье

    if (!payload) {
        loginValue.innerHTML = 'Привет, анониим!'
        logoutbtn.style = `opacity: 1;`
        logoutbtn.innerText = 'Войти'
        // logoutbtn.onclick = () => main.innerHTML = `<a href="#/login/"></a>`
        logoutbtn.href = "#/login/"
        loginDiv.appendChild(upsertBTN)
        // upsertBTN.style = `opacity: 1;`
        upsertBTN.innerText = 'Зарегаться'
        upsertBTN.href = "#/upsert/"
        historyBtn.remove()
        cartIcon.removeAttribute('onclick')
        cartIcon.style = `cursor: auto;`

    }

    if (payload) {
        tokenCheck = store.getState().auth.token

        loginValue.innerHTML = `Привет, ${store.getState().auth.payload.sub.login}`
        // console.log('aga')
        logoutbtn.style = `opacity: 1;`
        // upsertBTN.style = `opacity: 0;`
        upsertBTN.remove()
        logoutbtn.innerText = 'Выйти'
        logoutbtn.removeAttribute('href')
        logoutbtn.onclick = () => {
            store.dispatch(actionAuthLogout())
        }
        loginDiv.appendChild(historyBtn)
        cartIcon.onclick = () => location.href = '#/cart/'
        cartIcon.style = `cursor: pointer;`
        cartValue.innerHTML = Object.keys(store.getState().cart).length

    }
}

store.subscribe(loginStatus)

// Запрос истории заказов

const orderFind = `query orderFind($query: String){
    OrderFind(query:$query){
      _id total orderGoods{good {_id, name}, total, price, count}
    }}`

const actionOrderFind = () => actionPromise('OrderFind', getGql(orderFind, {query: JSON.stringify([{}])}))

const orderHistory = () => {
    const [, route] = location.hash.split('/')
    if (route !== 'history') return

    // store.dispatch(actionOrderFind())

    const {status, payload, error} = store.getState().promise.OrderFind || {}//.имя одно
    if (status === 'PENDING') {
        main.innerHTML = `<img src='https://cdn.dribbble.com/users/63485/screenshots/1309731/infinite-gif-preloader.gif' />`
    }
    if (status === 'FULFILLED') {
        main.innerHTML = `<h1>ИСТОРИЯ ЗАКАЗОВ</h1>
                               
                         `
        for (let item in payload) {
            const div = document.createElement('div')
            main.appendChild(div)
            div.style = `margin: 15px;`

            const orderNumber = document.createElement('div')
            orderNumber.innerText = `ID заказа: ${payload[item]._id}`
            div.appendChild(orderNumber)

            const orderSum = document.createElement('div')
            orderSum.innerText = `Сумма заказа: ${payload[item].total}`
            div.appendChild(orderSum)
        }


    }


}
store.subscribe(orderHistory)

// Запрос оформления заказа

const orderUpsert = `mutation newOrder($orderGoods: [OrderGoodInput]) {
    OrderUpsert(order: {orderGoods: $orderGoods}) {
      _id
      createdAt
      total
    }
  }`;

const actionOrderUpsert1 = (orderGoods) => {
    for (const key in orderGoods) {
        if (orderGoods.hasOwnProperty(key)) {
            orderGoods[key].good = {_id: orderGoods[key].good._id};
        }
    }
    console.log(Object.values(orderGoods))


    actionPromise('OrderUpsert', gql("http://shop-roles.node.ed.asmer.org.ua/graphql", orderUpsert, Object.values(orderGoods)))
}


const actionOrderUpsert = () => {
    return async dispatch => {
        const orderGoods = Object.values(store.getState().cart)

        for (const key in orderGoods) {
            orderGoods[key].good = {_id: orderGoods[key].good._id};
        }
        console.log(orderGoods)
        // dispatch(actionPromise('OrderUpsert', gql("http://shop-roles.node.ed.asmer.org.ua/graphql", orderUpsert, orderGoods)))
        dispatch(actionPromise('OrderUpsert', getGql(orderUpsert, {orderGoods: orderGoods})))
    }
}

// debugger
console.log(store.getState())


const cartPage = () => {
    const [, route] = location.hash.split('/')
    if (route !== 'cart') return

    main.innerHTML = `<h1>КОРЗИНА</h1>
                      <div id='cartList'></div>
                          
    `

    if (!store.getState().auth.token) {
        return
    }

    // const payload  = store.getState().cart
    const cartList = document.getElementById('cartList')
    for (let item in store.getState().cart) {
        // debugger
        const div = document.createElement('div')
        cartList.appendChild(div)
        div.style = `display: flex;
        flex-direction: row;
        margin: 15px;`

        const name = document.createElement('div')
        // console.log(payload)
        // console.log(store.getState().cart[item])
        name.innerText = store.getState().cart[item].good.name
        div.appendChild(name)
        name.style.margin = '15px'

        const price = document.createElement('div')
        price.innerText = `${store.getState().cart[item].good.price} тенге`
        div.appendChild(price)
        price.style.margin = '15px'

        const count = document.createElement('div')
        // count.setAttribute('type', 'number')
        count.style.width = '50px'
        name.style.margin = '15px'
        count.innerHTML = store.getState().cart[item].count
        div.appendChild(count)

        const add = document.createElement('button')
        add.innerText = '+1'
        add.onclick = () => store.dispatch(actionCartAdd({
            _id: store.getState().cart[item].good._id,
            price: store.getState().cart[item].good.price,
            name: store.getState().cart[item].good.name
        }))
        div.appendChild(add)

        const sub = document.createElement('button')
        sub.innerText = '-1'
        sub.onclick = () => store.dispatch(actionCartSub({
            _id: store.getState().cart[item].good._id,
            price: store.getState().cart[item].good.price,
            name: store.getState().cart[item].good.name
        }))
        div.appendChild(sub)

        const set = document.createElement('input')
        set.setAttribute('type', 'number')
        set.innerHTML = item.count
        set.onchange = () => store.dispatch(actionCartSet({
            _id: store.getState().cart[item].good._id,
            price: store.getState().cart[item].good.price,
            name: store.getState().cart[item].good.name
        }, set.value))
        div.appendChild(set)

        const del = document.createElement('button')
        del.innerText = 'Удалить'
        del.onclick = () => store.dispatch(actionCartDel({
            _id: store.getState().cart[item].good._id,
            price: store.getState().cart[item].good.price,
            name: store.getState().cart[item].good.name
        }))
        div.appendChild(del)
    }

    const clearCart = document.createElement('button')
    clearCart.innerText = 'Очистить корзину'
    main.appendChild(clearCart)
    clearCart.onclick = () => store.dispatch(actionCartClear())

    const makeOrderBtn = document.createElement('button')
    makeOrderBtn.innerText = 'Сделать заказ'
    main.appendChild(makeOrderBtn)

    makeOrderBtn.onclick = async () => {
        // console.log('test')
        await store.dispatch(actionOrderUpsert())
        await store.dispatch(actionCartClear())
    }

}


store.subscribe(cartPage)


window.onhashchange = () => {
    const [, route, _id] = location.hash.split('/')

    const routes = {
        category() {
            store.dispatch(actionCategoryById(_id))
        },
        good() {
            //тут был store.dispatch goodById
            store.dispatch(actionGoodById(_id))
            console.log('good', _id)
        },
        login() {
            console.log('А ТУТ ЩА ДОЛЖНА БЫТЬ ФОРМА ЛОГИНА')
            //нарисовать форму логина, которая по нажатию кнопки Login делает store.dispatch(actionFullLogin(login, password))
            loginForm()
        },
        upsert() {
            upsertForm()
            console.log('ТУТ РЕГИСТРАЦИЯ')
            ////нарисовать форму регистрации, которая по нажатию кнопки Login делает store.dispatch(actionFullRegister(login, password))
        },
        cart() {
            console.log('КОРЗИНА')
            // store.dispatch(actionOrderUpsert())
            cartPage()
        },
        history() {
            console.log('ИСТОРИЯ ЗАКАЗОВ')
            store.dispatch(actionOrderFind())
            // orderHistory()
        }

    }

    if (route in routes) {
        routes[route]()
    }
}
store.subscribe(() => console.log(store.getState()))

window.onhashchange()