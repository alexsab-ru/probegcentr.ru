import salons from '@/data/salons.json';
import  { phoneFormat } from '@/js/use/numbers.format';
const balloonContentHeader = name => {return `<h6 class="text-sm"><b>${name}</b></h6>`};
const balloonContentBody = (hours, phone, link) => {
	return `
	<p>${hours}</p>
	<a href="tel:${phoneFormat(phone)}" class="inline-block text-lg text-accent-500 my-1">${phone}</a><br>
	<a href="${link}"  target="_blank" class="text-sm">📍 Как добраться</a><br>
	`
}
const parent = document.querySelector(".map");

let start_load_script = false, // Переменная для определения была ли хоть раз загружена Яндекс.Карта (чтобы избежать повторной загрузки при наведении)
	end_load_script = false; // Переменная для определения был ли загружен скрипт Яндекс.Карт полностью (чтобы не возникли какие-нибудь ошибки, если мы загружаем несколько карт одновременно)

let myMapTemp = null;

//Функция создания карты сайта и затем вставки ее в блок с идентификатором "map-yandex"
function init() {
	if (!myMapTemp) {
		myMapTemp = new ymaps.Map("map", {
			center: [53.195878, 50.100202],
			zoom: 10,
			controls: ["zoomControl"],
		});
	}
	myMapTemp.behaviors.disable("scrollZoom");
	salons.map((salon) => {
		myMapTemp.geoObjects.add(
			new ymaps.Placemark(
				[salon.map.coords[0], salon.map.coords[1]],
				{
					balloonContentHeader: balloonContentHeader(salon.name),
					balloonContentBody: balloonContentBody(salon.work_hours, salon.phone, salon.map.ya_link),
					balloonContentFooter: '',
					hintContent: salon.address,
				},
				{
					preset: "islands#blueAutoIcon",
					iconColor: "#06B6D4",
				}
			)
		);
	});

	// myMapTemp.balloon.open(this.position,
	//     this.balloonContentHeader + this.balloonContentFooter + this.balloonContentBody, {});
	// Получаем первый экземпляр коллекции слоев, потом первый слой коллекции
	var layer = myMapTemp.layers.get(0).get(0);

	// Решение по callback-у для определния полной загрузки карты
	waitForTilesLoad(layer).then(function (value) {
		// Скрываем индикатор загрузки после полной загрузки карты
		parent.querySelector(".loader").classList.remove("is-active");
	});
}

// Функция для определения полной загрузки карты (на самом деле проверяется загрузка тайлов)
function waitForTilesLoad(layer) {
	return new ymaps.vow.Promise(function (resolve, reject) {
		var tc = getTileContainer(layer),
			readyAll = true;
		tc.tiles.each(function (tile, number) {
			if (!tile.isReady()) {
				readyAll = false;
			}
		});
		if (readyAll) {
			resolve();
		} else {
			tc.events.once("ready", function () {
				resolve();
			});
		}
	});
}

function getTileContainer(layer) {
	for (var k in layer) {
		if (layer.hasOwnProperty(k)) {
			if (
				layer[k] instanceof ymaps.layer.tileContainer.CanvasContainer ||
				layer[k] instanceof ymaps.layer.tileContainer.DomContainer
			) {
				return layer[k];
			}
		}
	}
	return null;
}

// Функция загрузки API Яндекс.Карт по требованию (в нашем случае при наведении)
function loadScript(url, callback) {
	var script = document.createElement("script");

	if (script.readyState) {
		// IE
		script.onreadystatechange = function () {
			if (script.readyState == "loaded" || script.readyState == "complete") {
				script.onreadystatechange = null;
				callback();
			}
		};
	} else {
		// Другие браузеры
		script.onload = function () {
			callback();
		};
	}

	script.src = url;
	document.getElementsByTagName("head")[0].appendChild(script);
}

// Основная функция, которая проверяет когда мы навели на блок с классом "ymap-container"
function ymap() {
	if (!start_load_script) {
		// проверяем первый ли раз загружается Яндекс.Карта, если да, то загружаем

		// Показываем индикатор загрузки до тех пор, пока карта не загрузится
		parent.querySelector(".loader").classList.add("is-active");

		// Чтобы не было повторной загрузки карты, мы изменяем значение переменной
		start_load_script = true;

		// Загружаем API Яндекс.Карт
		loadScript(
			"https://api-maps.yandex.ru/2.1/?lang=ru_RU&loadByRequire=1",
			function () {
				end_load_script = !end_load_script;
				// Как только API Яндекс.Карт загрузились, сразу формируем карту и помещаем в блок с идентификатором "map-yandex"
				ymaps.ready(init);
			}
		);
	}
}

if (parent) {
	parent.onmouseenter = function () {
		ymap();
	}
}