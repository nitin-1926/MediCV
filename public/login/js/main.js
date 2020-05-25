
(function ($) {
    "use strict";


    /*==================================================================
    [ Focus Contact2 ]*/
    $('.input100').each(function(){
        $(this).on('blur', function(){
            if($(this).val().trim() != "") {
                $(this).addClass('has-val');
            }
            else {
                $(this).removeClass('has-val');
            }
        })    
    })
  
  
    /*==================================================================
    [ Validate ]*/
    var input = $('.validate-input .input100');

    $('.validate-form').on('submit',function(event){
        event.preventDefault();
        var check = true;

        for(var i=0; i<input.length; i++) {
            if(validate(input[i]) == false){
                showValidate(input[i]);
                check=false;
            }
        }

        if(check==true){
            if($('.login100-form-btn')[0].innerText == 'REGISTER'){
                if(!validateConfirmPassword($('.validate-input .input100')[1],$('.validate-input .input100')[2])){
                    check=false;
                    showValidate($('.validate-input .input100')[2]);
                } else {
                    handleRegister(event);
                }
            } else {
                handleLogin(event);
            }
        }
        return check;

    });

    function handleLogin(event){
		// event.preventDefault();
		$("#errLogin").css("display", "none");
		
		const user = {
		  	username: $("#inputEmail").val(),
		  	password: $("#inputPassword").val()
		  }
			var xhttp = new XMLHttpRequest();
    	xhttp.onreadystatechange = function() {
        if (this.readyState == 4 ) {
					if( this.status == 401){
						$("#errLogin").css("display", "block");
					} else if(this.status ==200) {
						window.location.href = "/home";
					}
       }
    	};
			xhttp.open("POST", "/login");
			xhttp.setRequestHeader("Content-type", "application/json");
    	xhttp.send(JSON.stringify(user));
		
    }
    
    function handleRegister(event) {
		// event.preventDefault();
		$('#errDiffPass').css("display", "none");
		$("#errRegd").css("display", "none");
		const user = {
		username: $("#inputEmail").val(),
		password: $("#inputPassword").val()
		}
		if($('#inputPassword').val() == $('#confirmPass').val()){
			var xhttp1 = new XMLHttpRequest();
		    xhttp1.onreadystatechange = function() {
		    if (this.readyState == 4) {
			if(this.status == 401){
				$("#errRegd").css("display", "block");
			} 
			else if(this.status == 200){
				window.location.href = "/home";
			}
		}
		};
			xhttp1.open("POST", "/register");
			xhttp1.setRequestHeader("Content-type", "application/json");
		xhttp1.send(JSON.stringify(user));
		} else {
			$('#errDiffPass').css("display", "block");
			$('#inputRegPassword').focus();
		}			
	}


    $('.validate-form .input100').each(function(){
        $(this).focus(function(){
           hideValidate(this);
        });
    });

    function validate (input) {
        if($(input).attr('type') == 'email' || $(input).attr('name') == 'username') {
            if($(input).val().trim().match(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/) == null) {
                return false;
            }
        }
        else {
            if($(input).val().trim() == ''){
                return false;
            }
            
        }
    }

    function validateConfirmPassword(i1, i2){        
        if(i1.value !== i2.value){
            return false;
        }
        return true;
    }

    function showValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).addClass('alert-validate');
    }

    function hideValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).removeClass('alert-validate');
    }
    

})(jQuery);