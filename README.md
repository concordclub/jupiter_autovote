# jupiter_autovote
Если вы наткнулись на это чудо, скорее всего в жизни вы уже отчаялись, софты на прокрутку layerzero и zksync уже не радуют ваших глаз?
разочарованию нет предела, и вы решили перейти на ретродропы в солане?

Как настроить эту байду, и что сделать для того чтобы самогонный аппарат поехал а не спиртовал деда почем зря?

## 0. пояснения
этот софт не предназначен для каких-то ебанутых глухих анти сибил кошельков, вы можете его ранить на них если уверены в том, что на ваших кошельках не нужен рефуел соланы/юпитера
софт может ломаться, но жизнь ломает кого угодно, 15 повторов на брусьях и посмотрим кто еще сломается
вроде как я наглухо тут все закрепил изолентой и говном т.к писалось это еще когда солана ощущала себя максимально паршиво и транзакции чудом уходили с 5 попытки с газом 2кк/1кк
***софт будет стейкать максимальное количество юпитера которое у вас есть, так что если вы холдер но не стейкер лучше выведите на другой кошелек***

рефуел ситуативный - если вы пихнули пустой кошелек он закинет туда солану + юпитер, застейкает и по возможности проголосует
если же вы стейкаете, и идет какой-то говернанс в котором вы не голосовали - он пойдет голосовать, и если на кошельке не хватает соланы он ее докинет с вашей основы

## 1. config.json - основной файл, там всякая всячина но вас интересуют такие поля:
**proposals** - туда вы пихаете ID голосования/-ий на юпитере, он прямо в ссылке вшит, не пропустите (на 4 декабря proposal = xMLsw7zzBfRXNiQQo42aUohRsibgrmWcPt2mD8HdUUr)
##
**vote_threshold** - сколько возможных вариантов проголосовать, условно да/нет = 2
##
**gas_presets** - перед тем как ездить на машине надо уметь открывать дверь, мой дефолт 300к/300к
##
**main_pk** - приватник от кошелька с которого будет рефуел соланы/jup'a (формат строка base58)
##

**jup_to_vote** - рефуел jup минималка (лучше от 1?)
##
**sol_to_transfer** - рефуел sol минималка (лучше от 0.02)
##

**rpc_url** - если есть РПЦ можете ставить будет легче жить, а так рассчитано на паблик ноду и терпилово
##
**delay > min/max** - это задержки, 2000-5000 проставлены чтобы можно было дышать с mainnet-beta RPC, если у вас кастом нода можете ставить хоть 0-0
##

## 2. data/wallets.txt
формате public_key:private_key с новой строчки (формат строка base58)

но почему public_key:private_key формат, можно же получать адрес с приватника?
можно, у меня даже несколько методов есть, но я так чувствую

## 3. догони меня кирпич
*cmd > npm i > npm start*
