import React, { useContext, useState } from 'react';
import '../../Stylesheets/CheckOut/CheckOut.css';
import { Table, Thead, Tbody, Tfoot, Tr, Th, Td, TableCaption, TableContainer, Flex, Input, Select, useDisclosure } from '@chakra-ui/react'
import { FcCancel, FcOk } from 'react-icons/fc';
import { cuilValidator, emptyField, invalidEmail, unverifiedData, validatePhone } from '../Validations/Validations';
import { CartContext } from '../../context/CartContext';
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../Config/FireBase';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const CheckOut = () => {
    const { Cart, countItems, totalAmount, removeAllItems } = useContext(CartContext);
    const navigate = useNavigate();

    const [buyData, setBuyData] = useState({
      name: '',
      email: '',
      confirmEmail:'',
      phone:'',
      registroIva: 'Consumidor final',
      cuil: ''
    })

    const [errores, setErrores] = useState({
      name: true,
      email: true,
      confirmEmail:true,
      phone: true,
      cuil: false
    })

    const updateBuyData = (e)=>{
      const valor = e.target.value ? e.target.value : '';
      setBuyData((buyer)=>(
        {...buyData,
          [e.target.name]: valor
      }));
      validateForm(e.target.name, valor, errores[e.target.name]);
    }

    const validateForm = (campo, valor, errorActual)=>{
      
      let errorValue = true;
      let modificarErrores = false;
      let campoControl=campo;

      switch (campo.toString()){
        case 'name':
          errorValue = emptyField(valor);
          modificarErrores = (errorValue != errores[campoControl]);
        break;
        case 'email':
          errorValue = invalidEmail(valor);
          modificarErrores = (errorValue != errores[campoControl]);
        break;
        case 'confirmEmail':
          errorValue = unverifiedData(valor, buyData.email);
          modificarErrores = (errorValue != errores[campoControl]);
        break;  
        case 'phone':
          errorValue = validatePhone(valor);
          modificarErrores = (errorValue != errores[campoControl]);
        break;
        case 'registroIva':
          campoControl='cuil';
          errorValue = (!buyData.cuil && valor!='Consumidor final');
          modificarErrores = (errorValue != errores[campoControl]);
        break;
        case 'cuil':
          errorValue = ! (cuilValidator(valor) || (!valor && buyData.registroIva==='Consumidor final'));
          modificarErrores = (errorValue != errores[campoControl]);
        break;    
      }
      if(modificarErrores){
        setErrores((error)=>({
          ...errores,
          [campoControl]: errorValue
        }))
      }
    }
    const procesarOrden = async () =>{
      if (errores.name || errores.email || errores.confirmEmail || errores.phone || errores.cuil || countItems() == 0)
        return;
      const today = new Date();
      const fechaCompra = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
      let ordenCompleta = true;
      let conStok=true;

      try{

        for(const item of Cart){
          const productRef = doc(db,'productos',item.id);
          const producto = await getDoc(productRef);
          const currentStock = producto.data().stock;

          if(item.cantidad <= currentStock){
            await updateDoc(productRef,{stock:currentStock-item.cantidad});
          }else{
            await updateDoc(productRef,{stock:0});
            ordenCompleta=false;
          }
        }

        const newOrder = {
          comprador: buyData,
          productos: Cart,
          cantidadProductos: countItems(),
          totalCompra: totalAmount(),
          fechaCompra: today,
          completeOrder: ordenCompleta
        }
  
        const ordersCollection = collection(db,'orders');
        
        const orderDocRef = await addDoc(ordersCollection,newOrder);

        const resultadoFinal = ordenCompleta?'Nos pondremos en contacto con usted en las proximas 48hs habiles para coordinar la entrega.'
        :'Al menos un producto <b>no tiene stock disponible</b>, nos comunicaremos con usted en las proximas 48hs habiles para verificar esta situacion y coordinar la entrega'

        Swal.fire({
          width: '650px',
          allowOutsideClick: false,
          title: 'Gracias por tu compra',
          html: `<div class="msgFinal">
                    <div>Su orden se genero correctamente, el Nro de remito es: <b>${orderDocRef.id}</b></div>
                    <div>Por favor tome nota del mismo antes de cerrar la ventana ya que es la referencia que se le solicitara para cualquier consulta sobre la operacion.
                    </div>
                    <div>${resultadoFinal}</div>
                 </div>`,
          icon: 'success',
          backdrop: true,
          confirmButtonText: 'Cerrar',
        }).then(()=> {
          removeAllItems();
          navigate('/');
        })
 
      }
      catch(error){
        Swal.fire({
          width: '650px',
          allowOutsideClick: false,
          title: 'Su compra no pudo ser procesada correctamente.',
          html: `<div class="msgFinal">
                    <div>Su orden no pudo generarse correctamente, por favor espere unos minutos y vuellva a intentarlo.</div>
                    <div>En caso de continuar el problema contactenos, gracias y disculpe las molestias.</div>
                 </div>`,
          icon: 'success',
          backdrop: true,
          confirmButtonText: 'Cerrar',
        })
      }
    }
    
    return (
      <Flex className={'flexContainer'}  >
        <TableContainer w={'610px'} className={'tableContainer'}>
        {
        countItems() > 0 ?
        
          <Table variant='unstyled' size='.9em' w={'550px'} className='formTable'>
            <TableCaption>{
              ! (errores.name || errores.email || errores.confirmEmail || errores.phone || errores.cuil) ?
              <button className='botonGeneral' onClick={procesarOrden}>Confirmar Compra</button>
              :''
            }</TableCaption>
            <Thead>
              <Tr>
                <Th colSpan={'3'} className='formTitle'>Ingrese Los datos de confirmacion de compra</Th>
              </Tr>
            </Thead>
            <Tbody className='formTableBody'>
              <Tr>
                <Td w={'150px'}>Nombre y Apellido:</Td>
                <Td w={'350px'}><Input name='name' type={'text'} w={'300px'} fontSize={'1em'} h={'30px'} onChange={updateBuyData} placeholder='Ingrese su Nombre y Apellido.'/></Td>
                <Td w={'50px'}>{
                  errores.name?
                    <FcCancel className='icono'/>
                    :<FcOk className='icono'/>
                  }</Td>
              </Tr>
              <Tr>
                <Td>Email:</Td>
                <Td w={'350px'}><Input name='email' type={'text'} w={'300px'} fontSize={'1em'} h={'30px'}  onChange={updateBuyData} placeholder='Ingrese su direccion de Email.'/></Td>
                <Td w={'50px'}>{
                  errores.email?
                    <FcCancel className='icono'/>
                    :<FcOk className='icono'/>
                  }</Td>
              </Tr>
              <Tr>
                <Td>Confirme Email:</Td>
                <Td w={'350px'}><Input name='confirmEmail' type={'text'} w={'300px'} fontSize={'1em'} h={'30px'}  onChange={updateBuyData} placeholder='Confirme su direccion de Email.'/></Td>
                <Td w={'50px'}> {
                  errores.confirmEmail?
                    <FcCancel className='icono'/>
                    :<FcOk className='icono'/>
                  }</Td>
              </Tr>
              <Tr>
                <Td>Telefono:</Td>
                <Td w={'350px'}><Input name='phone' type={'number'} w={'150px'} fontSize={'1em'} h={'30px'}  onChange={updateBuyData} placeholder='54 11 1111-1111'/></Td>
                <Td w={'50px'}> {
                  errores.phone?
                    <FcCancel className='icono'/>
                    :<FcOk className='icono'/>
                  }</Td>
              </Tr>
              <Tr>
                <Td>Registo Iva:</Td>
                <Td w={'350px'}><Select name='registroIva' w={'300px'} fontSize={'1em'} h={'30px'}  onChange={updateBuyData}>
                                  <option defaultValue value='Consumidor final'>Consumidor final</option>
                                  <option value='Factura B'>Factura B</option>
                                  <option value='Exento'>Exento</option>
                                </Select>
                </Td>
                <Td w={'50px'}></Td>
              </Tr>
              <Tr className={buyData.registroIva==='Consumidor final' ? 'invisible':''}>
                <Td>Cuil:</Td>
                <Td w={'350px'}><Input name='cuil' type={'number'} w={'150px'} fontSize={'1em'} h={'30px'}  onChange={updateBuyData} placeholder='Ingrese su Cuil.'/></Td>
                <Td w={'50px'}>
                  {  
                  errores.cuil?
                    <FcCancel className='icono'/>
                    :<FcOk className='icono'/>
                  }  
                </Td>
                  
              </Tr>
            </Tbody>
            <Tfoot>
              <Tr>
                <Th  colSpan={'3'}></Th>
              </Tr>
            </Tfoot>
          </Table>
         :
        <div className='mensajeNoProductos'>No hay productos en el carrito, 
                                            por favor agregue al carrito los productos que desea comprar.</div>
       }
      </TableContainer> 
    </Flex>
    )
}

export default CheckOut
