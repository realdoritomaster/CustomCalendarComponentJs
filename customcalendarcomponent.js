function usePopup(start_value) {
    const ID = "custom-popup";
  
    let handleTransform = (popup, container) => {
       
      let height = $(container).height();

      popup.style.position = "absolute";
      popup.style.transform = "translateY(" + (-height - 3) + "px)";
    };

    let handleClick = (ev) => {
        ev.stopPropagation();
    }
  
    let getElement = () => {
      return $("#" + ID);
    };
  
    let updateValue = () => {
      if (getElement().length) {
        getElement().html(this.value);
      }
    };
  
    this.value = start_value;

    this.popupExists = () => {
        return $("#" + ID).length>0?true:false;
    }
  
    this.createPopup = (el) => {
      let popup = $("<div></div>");
  
      popup.html(this.value);
      popup.addClass("popup");
      popup.attr("id", ID);
      $(el).append(popup);

      handleTransform(popup[0], el);
      $(popup).on("click", (ev)=> {
        handleClick(ev);
      });
    };
  
    this.destroyPopup = () => {
      let popup = getElement();
      $(popup).off("click", handleClick);
      popup.remove();
    };
  
    this.setValue = (e) => {
      this.value = e;
      updateValue();
    };
  
    return [this.value, this.setValue, this.createPopup, this.destroyPopup, this.popupExists];
}


document.addEventListener('DOMContentLoaded', function() {

    const currentDate = new Date();
    const currentDateString = dateToYearMonthDay(currentDate);
    
    let selectedDate = currentDate;
    let getSelectedYear = ()=> selectedDate.getFullYear();
    let getSelectedMonthNum = ()=> selectedDate.getMonth();
    let getSelectedMonthAndYear = ()=> {
        const month = selectedDate.toLocaleString('default', {month: 'long'});
        const year = getSelectedYear();
        return `${month}, ${year}`;
    };
    let getDaysInMonth = ()=> new Date(getSelectedYear(), getSelectedMonthNum() + 1, 0).getDate();

    //Gets first and last day of month as index of the week. (Sunday:0, Monday:1, etc.)
    let getFirstDayOfMonth = ()=> new Date(getSelectedYear(), getSelectedMonthNum()).getDay();
    let getLastDayOfMonth = ()=> new Date(getSelectedYear(), getSelectedMonthNum()+1, 0).getDay();

    var [currentPopupValue, setPopupValue, createPopup, destroyPopup, popupExists] = usePopup("");
    
    //const popupManager = new PopupManager('Initial value');

    let events = [];

    init();

    async function getEvents() {
        try {
            const response = await fetch("https://date.nager.at/api/v3/publicholidays/2024/US");
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
    
            const json = await response.json();
            console.log(json);
            for (let event of json) {
                events.push({date: event.date, name: event.name});
            }
        } catch(ex) {
            console.error(ex.message);
        }
    }

    function dateToYearMonthDay(date) {
        const dateObj = typeof(date)==Date ? date : new Date(date);
        const month   = dateObj.getUTCMonth() + 1; // months from 1-12
        const day     = dateObj.getUTCDate();
        const year    = dateObj.getUTCFullYear();

        const newDate = month + "/" + day + "/" + year;
        return newDate;
    }

    function getEvent(date) {
        const results = events.filter((event)=>dateToYearMonthDay(date)==dateToYearMonthDay(event.date));
        return results;
    }


    function populateDataCells() {
        let body = $("#calendarBody");
        body.empty();

        let tableRow = $("<tr></tr>");

        let cellIndex = 0;

        let selected = null;

        for (let i = 0; i < getFirstDayOfMonth(); i++) {
            cellIndex++;
            tableRow.append($(`<td class="empty"> </td>`));
        }

        for (let i = 1; i <= getDaysInMonth(); i++) {
            let date = dateToYearMonthDay(new Date(getSelectedYear(), getSelectedMonthNum(), i));
            let tableCellId = date.replaceAll("/","");
            let eventsToday = getEvent(date);

            cellIndex++;
            let dayOfWeek = cellIndex % 7;
            
            let classes = "";
            
            if (date === currentDateString){
                classes += "current-day ";
            }

            if (eventsToday.length > 0) classes += "has-events ";

            let cell = $(
            `<td class="${classes.trim()}" id=${tableCellId} tabindex=${eventsToday.length>0?0:-1}>
                <span>${i}</span>
                ${
                eventsToday.length > 0 ?
                `<div class="event-data">
                    ${eventsToday.map(()=> {
                        return (`
                            <div class="event"></div>
                        `);
                    }).join("")}
                </div>` : ""
                }
            </td>`);

            tableRow.append(cell);
            
            if (eventsToday.length > 0) {
                $(document.body).on("click", ()=> {
                    if (popupExists() && selected != null) {
                        deselectTableCell();
                    }
                });
                $(document).on("keydown", (ev)=> {
                    if (ev.key === "Tab") {
                        if (popupExists() && selected != null) {
                            deselectTableCell();
                        }
                    }
                });
                $(cell).on("click", (ev)=> {
                    if (!popupExists()) {
                        selectTableCell();
                    } else if (popupExists() && selected !== tableCellId) {
                        deselectTableCell();
                        selectTableCell();
                    }
                    ev.stopPropagation();
                });
                $(cell).on("keypress", function(ev) {
                    if (ev.key === "Enter") {
                        if (!popupExists()) {
                            selectTableCell();
                        } else if (popupExists() && selected !== tableCellId) {
                            deselectTableCell();
                            selectTableCell();
                        }
                    }
                  });

                function deselectTableCell() {
                    $(`#${selected}`).removeClass("selected");
                    destroyPopup();
                    selected = null;
                }

                function selectTableCell() {
                    selected = tableCellId;
                    $(`#${selected}`).addClass("selected");
                    createPopup(cell);
                    setPopupValue(`${eventsToday.map((event) => event.name).join(", ")}<br/>${date}`);
                }
            }

            if ((dayOfWeek == 0 && i != 0) || i == getDaysInMonth()) {
                body.append(tableRow);
                tableRow = $("<tr></tr>");
            }
        }

        let lastChild = body.children().last();
        for (let i = 0; i < 7-(getLastDayOfMonth()+1); i++) {
            cellIndex++;
            lastChild.append($(`<td class="empty"> </td>`));
        }
    }

    function setMonthElement() {
        let e = $("#monthText");
        e.text(getSelectedMonthAndYear());
    }

    function reset() {
        selectedDate = currentDate;
        reloadCalendar();
    }

    function reloadCalendar() {
        populateDataCells();
        setMonthElement();
    }

    function setRelativeMonth(increment) {
        selectedDate = new Date(getSelectedYear(), getSelectedMonthNum() + increment);
        reloadCalendar();
    }

    function onLastMonthButtonClicked() {
        setRelativeMonth(-1);
    }

    function onNextMonthButtonClicked() {
        setRelativeMonth(1);
    }

    function onResetButtonClicked() {
        reset();
    }

    async function init() {
        setMonthElement();
        await getEvents();
        populateDataCells();
        
        $("#lastMonthButton").on("click", () => {
            onLastMonthButtonClicked();
        })

        $("#nextMonthButton").on("click", () => {
            onNextMonthButtonClicked();
        })

        $("#resetButton").on("click", () => {
            onResetButtonClicked();
        })
    }
});